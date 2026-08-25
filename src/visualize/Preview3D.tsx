import {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {SVGLoader} from 'three/examples/jsm/loaders/SVGLoader';

import {Kind} from '../context/general';
import {useStore} from '../context/store';
import {useEffectiveTheme} from '../theme';
import {Anchor} from '../render/base';
import {
	renderThroughTails,
	renderHalfTailsA,
	renderHalfTailsB,
} from '../render/tails';
import {
	renderThroughPinsA,
	renderHalfPinsA,
	renderHalfPinsB,
} from '../render/pins';
import {CANVAS_COLORS} from './colors';

import type {Store} from '../context/store';
import type {Pin} from '../context/pins';
import type {CanvasColors} from './colors';

// Matches the defaults in the half-blind generate module
const GLUE_GAP = 0.02;
const EXTRA_DEPTH = 0.1;

// How far the boards extend beyond the joint, relative to the board
// width, purely for looks
const BOARD_LENGTH_FACTOR = 0.7;

// The 3D model of the joint lives in mm coordinates: x runs across
// the board width, y through the pin board from its outer face, and
// z up along the pin board, with the tail board lying in z 0..Tt
type JointSpec = {
	width: number,
	// Thickness of the tail board (z) and the pin board (y)
	tailThickness: number,
	pinThickness: number,
	// How deep the tails reach into the pin board; equal to
	// pinThickness for through dovetails
	depth: number,
	// How much each tapered flank shifts over the depth
	taper: number,
	pins: Pin[],
	halfPinWidth: number,
};

function tailBoardGeometry(spec: JointSpec): THREE.ExtrudeGeometry {
	const {width, tailThickness, depth, taper, pins, halfPinWidth} = spec;
	const length = depth + width * BOARD_LENGTH_FACTOR;

	// The face profile in (x, u), u being the distance from the
	// board end, with the pin sockets notched out of the u = 0 edge
	const shape = new THREE.Shape();
	shape.moveTo(0, length);
	if (halfPinWidth > 0) {
		shape.lineTo(0, depth);
		shape.lineTo(halfPinWidth, depth);
		shape.lineTo(Math.max(halfPinWidth - taper, 0.01), 0);
	} else {
		shape.lineTo(0, 0);
	}
	for (const pin of pins) {
		const minHalf = Math.max(pin.maxWidth / 2 - taper, 0.01);
		shape.lineTo(pin.x - minHalf, 0);
		shape.lineTo(pin.x - pin.maxWidth / 2, depth);
		shape.lineTo(pin.x + pin.maxWidth / 2, depth);
		shape.lineTo(pin.x + minHalf, 0);
	}
	if (halfPinWidth > 0) {
		shape.lineTo(width - Math.max(halfPinWidth - taper, 0.01), 0);
		shape.lineTo(width - halfPinWidth, depth);
		shape.lineTo(width, depth);
	} else {
		shape.lineTo(width, 0);
	}
	shape.lineTo(width, length);
	shape.closePath();

	return new THREE.ExtrudeGeometry(
		shape,
		{depth: tailThickness, bevelEnabled: false},
	);
}

function pinBoardGeometries(spec: JointSpec): THREE.BufferGeometry[] {
	const {
		width,
		tailThickness,
		pinThickness,
		depth,
		taper,
		pins,
		halfPinWidth,
	} = spec;
	const length = width * BOARD_LENGTH_FACTOR;
	const geometries: THREE.BufferGeometry[] = [];

	// The pins interlocking with the tail board, as prisms through
	// the tail board thickness; they exactly fill the notches cut
	// out of the tail board profile
	function prism(points: [number, number][]) {
		const shape = new THREE.Shape();
		shape.moveTo(...points[0]);
		for (const point of points.slice(1)) {
			shape.lineTo(...point);
		}
		shape.closePath();
		return new THREE.ExtrudeGeometry(
			shape,
			{depth: tailThickness, bevelEnabled: false},
		);
	}

	if (halfPinWidth > 0) {
		const minWidth = Math.max(halfPinWidth - taper, 0.01);
		geometries.push(prism([
			[0, 0],
			[minWidth, 0],
			[halfPinWidth, depth],
			[0, depth],
		]));
		geometries.push(prism([
			[width - minWidth, 0],
			[width, 0],
			[width, depth],
			[width - halfPinWidth, depth],
		]));
	}
	for (const pin of pins) {
		const minHalf = Math.max(pin.maxWidth / 2 - taper, 0.01);
		geometries.push(prism([
			[pin.x - minHalf, 0],
			[pin.x + minHalf, 0],
			[pin.x + pin.maxWidth / 2, depth],
			[pin.x - pin.maxWidth / 2, depth],
		]));
	}

	// The prisms live in socket coordinates; shift everything so the
	// socket bottoms sit at the right depth inside the pin board
	for (const geometry of geometries) {
		geometry.translate(0, pinThickness - depth, 0);
	}

	// The lap between the socket bottoms and the outer face, which
	// only exists for half-blind dovetails
	if (pinThickness - depth > 0.01) {
		const lap = new THREE.BoxGeometry(
			width,
			pinThickness - depth,
			tailThickness,
		);
		lap.translate(
			width / 2,
			(pinThickness - depth) / 2,
			tailThickness / 2,
		);
		geometries.push(lap);
	}

	// The rest of the board above the joint
	const rest = new THREE.BoxGeometry(width, pinThickness, length);
	rest.translate(width / 2, pinThickness / 2, tailThickness + length / 2);
	geometries.push(rest);

	return geometries;
}

// Which corner of the assembly is modeled: the two are mirror
// images, cut with the matching A or B template pair
type Corner = 'a' | 'b';

export const TAIL_BOARD = 'tailBoard';
export const PIN_BOARD = 'pinBoard';
export const TAILS_TEMPLATE = 'tailsTemplate';
export const PINS_TEMPLATE = 'pinsTemplate';
export const TEMPLATES = 'templates';
type ToggleName = (
	typeof TAIL_BOARD |
		typeof PIN_BOARD |
		typeof TEMPLATES
);
type Visibility = Record<ToggleName, boolean>;

const TOGGLE_KEYS: {[key: string]: ToggleName | undefined} = {
	'1': TAIL_BOARD,
	'2': PIN_BOARD,
	'3': TEMPLATES,
};

// Each template only shows while both the templates toggle and its
// own board are visible
function applyVisibility(root: THREE.Object3D, visibility: Visibility) {
	const resolved = {
		[TAIL_BOARD]: visibility[TAIL_BOARD],
		[PIN_BOARD]: visibility[PIN_BOARD],
		[TAILS_TEMPLATE]:
			visibility[TEMPLATES] && visibility[TAIL_BOARD],
		[PINS_TEMPLATE]:
			visibility[TEMPLATES] && visibility[PIN_BOARD],
	};
	for (const [name, visible] of Object.entries(resolved)) {
		const object = root.getObjectByName(name);
		if (object) {
			object.visible = visible;
		}
	}
}

function buildJoint(spec: JointSpec, colors: CanvasColors): THREE.Group {
	const group = new THREE.Group();

	function addBoard(
		geometries: THREE.BufferGeometry[],
		color: string,
		name: string,
	) {
		const board = new THREE.Group();
		board.name = name;
		const material = new THREE.MeshLambertMaterial(
			{color: new THREE.Color(color)},
		);
		const edgeMaterial = new THREE.LineBasicMaterial(
			{color: new THREE.Color(colors.dimension)},
		);
		for (const geometry of geometries) {
			board.add(new THREE.Mesh(geometry, material));
			board.add(
				new THREE.LineSegments(
					new THREE.EdgesGeometry(geometry, 25),
					edgeMaterial,
				),
			);
		}
		group.add(board);
	}

	// The tail board keeps the editor's board color, the pin board
	// uses the mating shade, matching the 2D mating board rendering
	const tailGeometry = tailBoardGeometry(spec);
	tailGeometry.translate(0, spec.pinThickness - spec.depth, 0);
	addBoard([tailGeometry], colors.board, TAIL_BOARD);
	addBoard(pinBoardGeometries(spec), colors.matingBoard, PIN_BOARD);

	return group;
}

// Renders one generated SVG template into a group, fills and
// outlines colored as in the exported file, and places it on a face
// of the model via the given transform, which maps SVG coordinates
// (x right, y down, origin at the template's top-left corner) into
// the scene
function buildTemplate(svg: string, matrix: THREE.Matrix4): THREE.Group {
	const group = new THREE.Group();
	const {paths} = new SVGLoader().parse(svg);

	for (const path of paths) {
		const style = path.userData?.style || {};
		if (style.fill && style.fill !== 'none') {
			const material = new THREE.MeshBasicMaterial(
				{
					color: new THREE.Color(style.fill),
					transparent: true,
					opacity: 0.45,
					side: THREE.DoubleSide,
					depthWrite: false,
				},
			);
			for (const shape of SVGLoader.createShapes(path)) {
				const mesh = new THREE.Mesh(
					new THREE.ShapeGeometry(shape),
					material,
				);
				mesh.renderOrder = 1;
				group.add(mesh);
			}
		}
		if (style.stroke && style.stroke !== 'none') {
			const material = new THREE.LineBasicMaterial(
				{color: new THREE.Color(style.stroke)},
			);
			for (const subPath of path.subPaths) {
				const line = new THREE.Line(
					new THREE.BufferGeometry().setFromPoints(
						subPath.getPoints(),
					),
					material,
				);
				line.renderOrder = 2;
				group.add(line);
			}
		}
	}

	group.applyMatrix4(matrix);
	return group;
}

// The templates are placed where they'd be applied in the actual
// cutting workflow: the tails template on the tail board's end
// grain, the through pins template on the pin board's end grain, and
// the half-blind pins template on the pin board's inner face
function buildTemplates(
	store: Store,
	spec: JointSpec,
	corner: Corner,
): THREE.Group {
	const {general: {kind, cutter: {dovetailDiameter}}} = store;
	// Both template SVGs pad the board area with this margin, so the
	// SVG origin sits one buffer outside the board's corner
	const buffer = 1.75 * dovetailDiameter;
	// Lifts each template slightly off its face to avoid z-fighting
	const lift = 0.3;

	const group = new THREE.Group();

	// The template layouts are mirrored relative to the modeled
	// boards: with the handedness of each face fixed by the cutting
	// workflow, the B pair's mirrored layout lands on the corner
	// modeled from the un-mirrored pin list, and the A pair on its
	// mirror image.  For half-blind this also puts the tails
	// template's inset edge (the rounded bit-flare corners) on the
	// face concealed inside the pin board's socket rather than the
	// exposed one
	let tailsTemplate = null;
	if (kind === Kind.Half) {
		tailsTemplate = buildTemplate(
			corner === 'a'
				? renderHalfTailsA(store)
				: renderHalfTailsB(store),
			new THREE.Matrix4().makeBasis(
				new THREE.Vector3(-1, 0, 0),
				new THREE.Vector3(0, 0, 1),
				new THREE.Vector3(0, -1, 0),
			).setPosition(
				spec.width + buffer,
				spec.pinThickness - spec.depth - lift,
				-buffer,
			),
		);
	} else {
		tailsTemplate = buildTemplate(
			renderThroughTails(store, Anchor.BottomLeft),
			new THREE.Matrix4().makeBasis(
				new THREE.Vector3(1, 0, 0),
				new THREE.Vector3(0, 0, -1),
				new THREE.Vector3(0, -1, 0),
			).setPosition(
				-buffer,
				spec.pinThickness - spec.depth - lift,
				spec.tailThickness + buffer,
			),
		);
	}
	tailsTemplate.name = TAILS_TEMPLATE;
	group.add(tailsTemplate);

	let pinsTemplate = null;
	if (kind === Kind.Half) {
		// The horizontal template reads top to bottom as: break line
		// (the sawtooth), socket bottoms one board thickness later at
		// the path origin, then the board end at the guide's bottom
		// edge, where the anchor sits.  SVG y therefore runs from the
		// board's interior toward its end, and both axes flip so the
		// template reads unmirrored looking at the inner face
		pinsTemplate = buildTemplate(
			corner === 'a'
				? renderHalfPinsA(store, GLUE_GAP, EXTRA_DEPTH)
				: renderHalfPinsB(store, GLUE_GAP, EXTRA_DEPTH),
			new THREE.Matrix4().makeBasis(
				new THREE.Vector3(-1, 0, 0),
				new THREE.Vector3(0, 0, -1),
				new THREE.Vector3(0, 1, 0),
			).setPosition(
				spec.width + buffer,
				spec.pinThickness + lift,
				buffer + 2 * spec.pinThickness,
			),
		);
	} else {
		pinsTemplate = buildTemplate(
			renderThroughPinsA(store, Anchor.BottomLeft),
			new THREE.Matrix4().makeBasis(
				new THREE.Vector3(1, 0, 0),
				new THREE.Vector3(0, 1, 0),
				new THREE.Vector3(0, 0, -1),
			).setPosition(-buffer, -buffer, -lift),
		);
	}
	pinsTemplate.name = PINS_TEMPLATE;
	group.add(pinsTemplate);

	return group;
}

function disposeJoint(group: THREE.Group) {
	group.traverse(
		(child) => {
			if (
				child instanceof THREE.Mesh
					|| child instanceof THREE.Line
			) {
				child.geometry.dispose();
				const materials = Array.isArray(child.material)
					? child.material
					: [child.material];
				for (const material of materials) {
					material.dispose();
				}
			}
		},
	);
}

type SceneState = {
	renderer: THREE.WebGLRenderer,
	scene: THREE.Scene,
	camera: THREE.PerspectiveCamera,
	controls: OrbitControls,
	render: () => void,
};

export default function Preview3D() {
	const [store] = useStore();
	const {
		general: {kind, material, cutter},
		guides: {preview3d},
		pins,
		halfPins,
	} = store;
	const canvasColors = CANVAS_COLORS[useEffectiveTheme()];
	const [corner, setCorner] = useState<Corner>('b');

	const mountRef = useRef<HTMLDivElement>(null);
	const stateRef = useRef<SceneState | null>(null);
	// Kept outside the scene state so it survives geometry rebuilds
	// while editing the design
	const visibilityRef = useRef<Visibility>(
		{[TAIL_BOARD]: true, [PIN_BOARD]: true, [TEMPLATES]: true},
	);

	// One-time scene setup, kept alive across store updates so the
	// camera position survives editing
	useEffect(
		() => {
			const mount = mountRef.current;
			if (!preview3d || !mount) {
				return;
			}

			const renderer = new THREE.WebGLRenderer({antialias: true});
			renderer.setPixelRatio(window.devicePixelRatio);

			const scene = new THREE.Scene();
			scene.add(new THREE.HemisphereLight(0xffffff, 0x555544, 1.6));
			const directional = new THREE.DirectionalLight(0xffffff, 2);
			directional.position.set(0.4, -1, 0.8);
			scene.add(directional);

			// Start centered on the outside diagonal of the corner,
			// looking up at the joint from below, where both the
			// tails' end grain and the interlocking profile on the
			// tail board face are visible
			const camera = new THREE.PerspectiveCamera(40, 1, 1, 10000);
			camera.up.set(0, 0, 1);
			const width = material.width;
			camera.position.set(width * .5, -width * .85, -width * .75);

			const controls = new OrbitControls(camera, renderer.domElement);
			const render = () => renderer.render(scene, camera);
			controls.addEventListener('change', render);

			const resize = () => {
				renderer.setSize(mount.clientWidth, mount.clientHeight);
				camera.aspect = mount.clientWidth / mount.clientHeight;
				camera.updateProjectionMatrix();
				render();
			};
			const observer = new ResizeObserver(resize);
			observer.observe(mount);

			const onKeyDown = (event: KeyboardEvent) => {
				if (event.metaKey || event.ctrlKey || event.altKey) {
					return;
				}
				const key = event.key.toLowerCase();
				if (key === 'a' || key === 'b') {
					event.preventDefault();
					setCorner(key);
					return;
				}

				const name = TOGGLE_KEYS[event.key];
				if (!name) {
					return;
				}
				event.preventDefault();

				visibilityRef.current[name] =
					!visibilityRef.current[name];
				applyVisibility(scene, visibilityRef.current);
				render();
			};
			mount.addEventListener('keydown', onKeyDown);

			mount.appendChild(renderer.domElement);
			resize();
			stateRef.current = {renderer, scene, camera, controls, render};

			return () => {
				observer.disconnect();
				mount.removeEventListener('keydown', onKeyDown);
				controls.dispose();
				renderer.dispose();
				mount.removeChild(renderer.domElement);
				stateRef.current = null;
			};
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[preview3d],
	);

	// Rebuild the joint model whenever the design changes
	useEffect(
		() => {
			const state = stateRef.current;
			if (!state) {
				return;
			}

			const boardThickness = kind === Kind.Half
				? material.dovetailLength
				: material.thickness;
			// The un-mirrored pin list models the B corner; its
			// mirror image is the A corner.  Through mode has no
			// corner variants, so the toggle only applies half-blind
			const mirrored = kind === Kind.Half && corner === 'a';
			const effectivePins = mirrored
				? pins.map((p) => ({...p, x: material.width - p.x}))
				: pins;
			const spec: JointSpec = {
				width: material.width,
				tailThickness: boardThickness,
				pinThickness: boardThickness,
				depth: material.thickness,
				taper: material.thickness
					* Math.tan(2 * cutter.angle * Math.PI / 360),
				pins: [...effectivePins].sort((a, b) => a.x - b.x),
				halfPinWidth: halfPins.enabled ? halfPins.width : 0,
			};

			state.scene.background = new THREE.Color(
				canvasColors.background,
			);
			const joint = buildJoint(spec, canvasColors);
			joint.add(buildTemplates(store, spec, corner));
			applyVisibility(joint, visibilityRef.current);
			state.scene.add(joint);
			state.controls.target.set(
				spec.width / 2,
				spec.pinThickness / 2,
				spec.tailThickness / 2,
			);
			state.controls.update();
			state.render();

			return () => {
				state.scene.remove(joint);
				disposeJoint(joint);
			};
		},
		[
			preview3d,
			kind,
			material,
			cutter,
			pins,
			halfPins,
			canvasColors,
			store,
			corner,
		],
	);

	if (!preview3d) {
		return null;
	}
	return (
		<div
			ref={mountRef}
			className="Preview3D Block"
			tabIndex={0}
		>
			<div className="Preview3DHints">
				<span>
					<kbd>1</kbd>
					<span
						className="Swatch"
						style={{background: canvasColors.board}}
					/>
					tail board
				</span>
				<span>
					<kbd>2</kbd>
					<span
						className="Swatch"
						style={{background: canvasColors.matingBoard}}
					/>
					pin board
				</span>
				<span>
					<kbd>3</kbd>
					templates
				</span>
				{kind === Kind.Half && <span>
					<kbd>A</kbd>/<kbd>B</kbd>
					corner ({corner.toUpperCase()})
				</span>}
				<span>drag to orbit &middot; scroll to zoom</span>
			</div>
		</div>
	);
}
