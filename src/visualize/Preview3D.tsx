import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

import {Kind} from '../context/general';
import {useStore} from '../context/store';
import {useEffectiveTheme} from '../theme';
import {CANVAS_COLORS} from './colors';

import type {Pin} from '../context/pins';
import type {CanvasColors} from './colors';

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

function buildJoint(spec: JointSpec, colors: CanvasColors): THREE.Group {
	const group = new THREE.Group();

	function addBoard(geometries: THREE.BufferGeometry[], color: string) {
		const material = new THREE.MeshLambertMaterial(
			{color: new THREE.Color(color)},
		);
		const edgeMaterial = new THREE.LineBasicMaterial(
			{color: new THREE.Color(colors.dimension)},
		);
		for (const geometry of geometries) {
			group.add(new THREE.Mesh(geometry, material));
			group.add(
				new THREE.LineSegments(
					new THREE.EdgesGeometry(geometry, 25),
					edgeMaterial,
				),
			);
		}
	}

	// The tail board keeps the editor's board color, the pin board
	// uses the mating shade, matching the 2D mating board rendering
	const tailGeometry = tailBoardGeometry(spec);
	tailGeometry.translate(0, spec.pinThickness - spec.depth, 0);
	addBoard([tailGeometry], colors.board);
	addBoard(pinBoardGeometries(spec), colors.matingBoard);

	return group;
}

function disposeJoint(group: THREE.Group) {
	for (const child of group.children) {
		if (
			child instanceof THREE.Mesh
				|| child instanceof THREE.LineSegments
		) {
			child.geometry.dispose();
			const materials = Array.isArray(child.material)
				? child.material
				: [child.material];
			for (const material of materials) {
				material.dispose();
			}
		}
	}
}

type SceneState = {
	renderer: THREE.WebGLRenderer,
	scene: THREE.Scene,
	camera: THREE.PerspectiveCamera,
	controls: OrbitControls,
	render: () => void,
};

export default function Preview3D() {
	const [
		{
			general: {kind, material, cutter},
			guides: {preview3d},
			pins,
			halfPins,
		},
	] = useStore();
	const canvasColors = CANVAS_COLORS[useEffectiveTheme()];

	const mountRef = useRef<HTMLDivElement>(null);
	const stateRef = useRef<SceneState | null>(null);

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

			mount.appendChild(renderer.domElement);
			resize();
			stateRef.current = {renderer, scene, camera, controls, render};

			return () => {
				observer.disconnect();
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
			const spec: JointSpec = {
				width: material.width,
				tailThickness: boardThickness,
				pinThickness: boardThickness,
				depth: material.thickness,
				taper: material.thickness
					* Math.tan(2 * cutter.angle * Math.PI / 360),
				pins: [...pins].sort((a, b) => a.x - b.x),
				halfPinWidth: halfPins.enabled ? halfPins.width : 0,
			};

			state.scene.background = new THREE.Color(
				canvasColors.background,
			);
			const joint = buildJoint(spec, canvasColors);
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
		[preview3d, kind, material, cutter, pins, halfPins, canvasColors],
	);

	if (!preview3d) {
		return null;
	}
	return <div ref={mountRef} className="Preview3D Block" />;
}
