import {Line} from 'react-konva';

import type {CanvasColors} from './colors';

type Props = {
	viewWidth: number,
	viewHeight: number,
	materialWidth: number,
	pixelsPerMM: number,
	x: number,
	canvasColors: CanvasColors,
};
export default function Guide(props: Props) {
	const {
		viewWidth,
		viewHeight,
		materialWidth,
		pixelsPerMM,
		x,
		canvasColors,
	} = props;

	const pxWidth = materialWidth * pixelsPerMM;
	const pxPosition = x * pixelsPerMM + (viewWidth - pxWidth) / 2;
	const color = Math.abs(x - materialWidth / 2) < 0.01
		? canvasColors.centerGuide
		: canvasColors.guide;

	return (
		<Line
			x={pxPosition}
			y={0}
			points={[0, 0, 0, viewHeight]}
			stroke={color}
			strokeWidth={1}
			dash={[10, 5]}
			dashEnabled
		/>
	);
}
