import {Line} from 'react-konva';

import type {CanvasColors} from './colors';

type Props = {
	viewWidth: number,
	viewHeight: number,
	materialWidth: number,
	materialThickness: number,
	pixelsPerMM: number,
	canvasColors: CanvasColors,
};
export default function ShoulderIndicator(props: Props) {
	const {
		viewWidth,
		viewHeight,
		materialWidth,
		materialThickness,
		pixelsPerMM,
		canvasColors,
	} = props;

	const pxWidth = materialWidth * pixelsPerMM;

	return (
		<Line
			x={(viewWidth - pxWidth) / 2}
			y={viewHeight * .2 + materialThickness * pixelsPerMM}
			points={[0, 0, pxWidth, 0]}
			stroke={canvasColors.shoulder}
			dash={[10, 5]}
			dashEnabled
		/>
	);
}
