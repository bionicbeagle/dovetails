import {useRef, useState, useLayoutEffect} from 'react';
import {Stage, Layer, Rect} from 'react-konva';

import {Kind} from '../context/general';
import {useStore} from '../context/store';
import {useGuideLocations} from '../context/guides';
import {update} from '../context/pins';

import {useLimits} from '../util/limits';
import {useEffectiveTheme} from '../theme';

import {CANVAS_COLORS} from './colors';

import Board from './Board';
import Dimensions from './Dimensions';
import Guide from './Guide';
import HalfPins from './HalfPins';
import Pin from './Pin';
import ShoulderIndicator from './ShoulderIndicator';

function useSize(target: React.RefObject<HTMLDivElement>) {
	const [size, setSize] = useState<DOMRect | null>();
	useLayoutEffect(
		() => setSize(
			target.current && target.current.getBoundingClientRect(),
		),
		[target],
	);
	useLayoutEffect(
		() => {
			const elem = target.current;
			if (!elem) {
				return;
			}

			const resizeObserver = new ResizeObserver(
				() => setSize(elem.getBoundingClientRect()),
			);
			resizeObserver.observe(elem);

			return () => resizeObserver.unobserve(elem);
		},
		[target],
	);

	if (!size) {
		return size;
	}
	return {width: size.width - 4, height: size.height - 4};
}


export default function Visualizer() {
	const target = useRef<HTMLDivElement>(null);
	const size = useSize(target);
	const [
		{
			general: {material, cutter, unit, kind},
			guides: {dimensions, matingBoard},
			pins,
			halfPins,
		},
		dispatch,
	] = useStore();
	const {pins: {minSpacing}} = useLimits();
	const guideLocations = useGuideLocations();
	const canvasColors = CANVAS_COLORS[useEffectiveTheme()];

	let stage = null;
	if (size) {
		// We'll use two possible criteria for the mm-to-pixels
		// conversion: either cutter height is 60% of the height, or
		// board width is 80% of the width, and we go with whichever
		// gives us the fewest pixels per millimeter to ensure the board
		// and pins fit nicely in the view
		let pixelsPerMM = Math.min(
			0.6 * size.height / material.thickness,
			0.8 * size.width / material.width,
		);
		// In half-blind mode the dimension overlay draws the mating
		// board's outer face above the board end, offset by the lap
		// (material thickness minus dovetail depth), which has to fit
		// into the empty band above the board along with the top
		// dimension row
		const lap = material.dovetailLength - material.thickness;
		if (kind === Kind.Half && lap > 0) {
			pixelsPerMM = Math.min(
				pixelsPerMM,
				Math.max(0.2 * size.height - 52, 24) / lap,
			);
		}

		const halfPinWidth = halfPins.enabled ? halfPins.width : 0;
		const commonProps = {
			viewWidth: size.width,
			viewHeight: size.height,
			// These have to be copied into props because the child
			// components won't have access to the global context
			// due to konva portaling them out of the main render tree
			materialWidth: material.width,
			materialThickness: material.thickness,
			cutterAngle: cutter.angle,
			pixelsPerMM,
			canvasColors,
			// With the mating board shown, the cutouts between the
			// tails read as its pins instead of empty space
			maskColor: matingBoard
				? canvasColors.matingBoard
				: canvasColors.background,
		};

		// In half-blind mode the mating board's lap extends past the
		// board end, so with the mating board shown we render that
		// band above the board too
		let lapBand = null;
		if (matingBoard && kind === Kind.Half) {
			const lapPx = (material.dovetailLength - material.thickness)
				* pixelsPerMM;
			const pxBoardWidth = material.width * pixelsPerMM;
			if (lapPx > 0) {
				lapBand = (
					<Rect
						x={(size.width - pxBoardWidth) / 2}
						y={size.height * .2 - lapPx}
						width={pxBoardWidth}
						height={lapPx}
						fill={canvasColors.matingBoard}
					/>
				);
			}
		}

		const guides = guideLocations.map(
			(x, i, xs) => <Guide key={i} x={x} {...commonProps} />,
		);

		let renderedHalfPins = null;
		if (halfPins.enabled) {
			renderedHalfPins = (
				<HalfPins width={halfPinWidth} {...commonProps} />
			);
		}

		const renderedPins = [...pins]
			.sort((a, b) => a.x - b.x)
			.map(
				(pin, i, ps) => {
					let minX = pin.maxWidth / 2
						+ halfPinWidth
						+ (halfPins.enabled ? minSpacing : 0);
					if (i > 0) {
						const previous = ps[i - 1];
						minX = previous.x
							+ previous.maxWidth / 2
							+ pin.maxWidth / 2
							+ minSpacing;
					}

					let maxX = material.width
						- pin.maxWidth / 2
						- halfPinWidth
						- (halfPins.enabled ? minSpacing : 0);
					if (i < ps.length - 1) {
						const next = ps[i + 1];
						maxX = next.x
							- next.maxWidth / 2
							- pin.maxWidth / 2
							- minSpacing;
					}

					return (
						<Pin
							key={i}
							onChange={(d) => dispatch(update(pin.id, d))}
							minX={minX}
							maxX={maxX}
							guides={guideLocations}
							{...pin}
							{...commonProps}
						/>
					);
				},
			);

		stage = (
			<Stage width={size.width} height={size.height}>
				<Layer>
					<Board {...commonProps} />
					{lapBand}
					{renderedHalfPins}
					{renderedPins}
					{guides}
					<ShoulderIndicator {...commonProps} />
					{dimensions && <Dimensions
						unit={unit}
						pins={pins}
						halfPinWidth={halfPinWidth}
						kind={kind}
						dovetailLength={material.dovetailLength}
						{...commonProps}
					/>}
				</Layer>
			</Stage>
		);
	}

	return (
		<div
			ref={target}
			className="Visualizer Block"
			style={{background: canvasColors.background}}
		>
			{stage}
		</div>
	);
}
