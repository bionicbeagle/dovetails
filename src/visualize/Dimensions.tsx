import {Arrow, Line, Text} from 'react-konva';

import {Kind, Unit} from '../context/general';

import type {Pin} from '../context/pins';
import type {CanvasColors} from './colors';

const MM_PER_INCH = 25.4;

const FONT_SIZE = 11;
// Rough estimate for deciding whether a label fits horizontally
// inside its segment
const PX_PER_CHAR = 7;

function format(mm: number, unit: Unit): string {
	if (unit === Unit.Inch) {
		return parseFloat((mm / MM_PER_INCH).toFixed(3)).toString();
	}
	return parseFloat(mm.toFixed(1)).toString();
}

type RowProps = {
	boundaries: number[],
	yLine: number,
	tickFrom: number,
	tickTo: number,
	pxBoardStart: number,
	pixelsPerMM: number,
	color: string,
	unit: Unit,
};
function DimensionRow(props: RowProps) {
	const {
		boundaries,
		yLine,
		tickFrom,
		tickTo,
		pxBoardStart,
		pixelsPerMM,
		color,
		unit,
	} = props;

	const rendered = [];
	let previous = boundaries[0];
	for (let i = 1; i < boundaries.length; i++) {
		const boundary = boundaries[i];
		// Pins touching a half pin or each other produce zero-length
		// segments, which we don't want to dimension
		if (boundary - previous < 0.05) {
			continue;
		}

		const pxStart = pxBoardStart + previous * pixelsPerMM;
		const pxEnd = pxBoardStart + boundary * pixelsPerMM;
		const pxCenter = (pxStart + pxEnd) / 2;

		const label = format(boundary - previous, unit);
		if (pxEnd - pxStart >= label.length * PX_PER_CHAR + 6) {
			rendered.push(
				<Text
					key={`label_${i}`}
					x={pxStart}
					y={yLine - FONT_SIZE - 5}
					width={pxEnd - pxStart}
					align="center"
					text={label}
					fontSize={FONT_SIZE}
					fill={color}
				/>,
			);
		} else {
			// Not enough horizontal room, so run the label upward
			// from just above the dimension line instead
			rendered.push(
				<Text
					key={`label_${i}`}
					x={pxCenter - FONT_SIZE / 2}
					y={yLine - 5}
					rotation={-90}
					text={label}
					fontSize={FONT_SIZE}
					fill={color}
				/>,
			);
		}

		rendered.push(
			<Arrow
				key={`segment_${i}`}
				points={[pxStart + 1, yLine, pxEnd - 1, yLine]}
				pointerAtBeginning
				pointerLength={5}
				pointerWidth={4}
				stroke={color}
				fill={color}
				strokeWidth={1}
			/>,
		);
		previous = boundary;
	}

	for (let i = 0; i < boundaries.length; i++) {
		const pxX = pxBoardStart + boundaries[i] * pixelsPerMM;
		rendered.push(
			<Line
				key={`tick_${i}`}
				points={[pxX, tickFrom, pxX, tickTo]}
				stroke={color}
				strokeWidth={1}
			/>,
		);
	}

	return <>{rendered}</>;
}

type VerticalProps = {
	pxX: number,
	yFrom: number,
	yTo: number,
	valueMM: number,
	tickTo: number,
	color: string,
	unit: Unit,
};
function VerticalDimension(props: VerticalProps) {
	const {pxX, yFrom, yTo, valueMM, tickTo, color, unit} = props;
	const label = format(valueMM, unit);

	return (
		<>
			<Line
				points={[pxX - 6, yFrom, tickTo, yFrom]}
				stroke={color}
				strokeWidth={1}
			/>
			<Line
				points={[pxX - 6, yTo, tickTo, yTo]}
				stroke={color}
				strokeWidth={1}
			/>
			<Arrow
				points={[pxX, yFrom + 1, pxX, yTo - 1]}
				pointerAtBeginning
				pointerLength={5}
				pointerWidth={4}
				stroke={color}
				fill={color}
				strokeWidth={1}
			/>
			<Text
				x={pxX - FONT_SIZE - 3}
				y={(yFrom + yTo) / 2 + label.length * PX_PER_CHAR / 2}
				rotation={-90}
				text={label}
				fontSize={FONT_SIZE}
				fill={color}
			/>
		</>
	);
}

type Props = {
	viewWidth: number,
	viewHeight: number,
	materialWidth: number,
	materialThickness: number,
	pixelsPerMM: number,
	cutterAngle: number,
	canvasColors: CanvasColors,
	unit: Unit,
	pins: Pin[],
	halfPinWidth: number,
	kind: Kind,
	dovetailLength: number,
};
export default function Dimensions(props: Props) {
	const {
		viewWidth,
		viewHeight,
		materialWidth,
		materialThickness,
		pixelsPerMM,
		cutterAngle,
		canvasColors,
		unit,
		pins,
		halfPinWidth,
		kind,
		dovetailLength,
	} = props;

	const pxBoardStart = (viewWidth - materialWidth * pixelsPerMM) / 2;
	const sortedPins = [...pins].sort((a, b) => a.x - b.x);

	// How much each flank of a pin narrows from the base line to the
	// top face
	const angleRad = 2 * cutterAngle * Math.PI / 360;
	const taper = materialThickness * Math.tan(angleRad);

	// Segments at the pin base line, where pins are widest and tails
	// narrowest
	const baseBoundaries = [0];
	// Segments at the top face, where pins are narrowest and tails
	// widest
	const topBoundaries = [0];

	if (halfPinWidth > 0) {
		baseBoundaries.push(halfPinWidth);
		topBoundaries.push(halfPinWidth - taper);
	}
	for (const pin of sortedPins) {
		baseBoundaries.push(pin.x - pin.maxWidth / 2);
		baseBoundaries.push(pin.x + pin.maxWidth / 2);
		topBoundaries.push(pin.x - pin.maxWidth / 2 + taper);
		topBoundaries.push(pin.x + pin.maxWidth / 2 - taper);
	}
	if (halfPinWidth > 0) {
		baseBoundaries.push(materialWidth - halfPinWidth);
		topBoundaries.push(materialWidth - halfPinWidth + taper);
	}
	baseBoundaries.push(materialWidth);
	topBoundaries.push(materialWidth);

	const yTop = viewHeight * .2;
	const yShoulder = yTop + materialThickness * pixelsPerMM;
	const yBaseLine = Math.min(yShoulder + 36, viewHeight - 16);

	// In half-blind mode the mating board's outer face is drawn
	// above the board end, and the top dimension row moves up to
	// stay clear of it
	const yMaterial = yShoulder - dovetailLength * pixelsPerMM;
	const yTopLine = Math.max(
		(kind === Kind.Half ? Math.min(yTop, yMaterial) : yTop) - 36,
		16,
	);

	// Vertical dimensions to the left of the board: the distance from
	// the board end to the shoulder line (material thickness for
	// through dovetails, dovetail depth for half-blind)
	const verticals = [
		<VerticalDimension
			key="depth"
			pxX={Math.max(pxBoardStart - 14, 4)}
			yFrom={yTop}
			yTo={yShoulder}
			valueMM={materialThickness}
			tickTo={pxBoardStart - 2}
			color={canvasColors.topDimension}
			unit={unit}
		/>,
	];
	// In half-blind mode the mating pins board sits against the
	// shoulder line, so its thickness measures upward from the
	// shoulder, with its outer face (the dashed line) landing above
	// the board end by the width of the lap
	if (
		kind === Kind.Half
			&& Math.abs(dovetailLength - materialThickness) > 0.05
	) {
		verticals.push(
			<VerticalDimension
				key="material"
				pxX={Math.max(pxBoardStart - 34, 4)}
				yFrom={yMaterial}
				yTo={yShoulder}
				valueMM={dovetailLength}
				tickTo={pxBoardStart - 2}
				color={canvasColors.topDimension}
				unit={unit}
			/>,
			<Line
				key="material_line"
				points={[
					pxBoardStart,
					yMaterial,
					pxBoardStart + materialWidth * pixelsPerMM,
					yMaterial,
				]}
				stroke={canvasColors.dimension}
				strokeWidth={1}
				dash={[6, 4]}
				dashEnabled
			/>,
		);
	}

	const common = {pxBoardStart, pixelsPerMM, unit};
	return (
		<>
			<DimensionRow
				boundaries={baseBoundaries}
				yLine={yBaseLine}
				tickFrom={yShoulder + 4}
				tickTo={yBaseLine + 8}
				color={canvasColors.dimension}
				{...common}
			/>
			<DimensionRow
				boundaries={topBoundaries}
				yLine={yTopLine}
				tickFrom={yTopLine - 8}
				tickTo={yTop - 4}
				color={canvasColors.topDimension}
				{...common}
			/>
			{verticals}
		</>
	);
}
