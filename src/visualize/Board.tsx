import {Rect} from 'react-konva';

import type {CanvasColors} from './colors';

type Props = {
	viewWidth: number,
	viewHeight: number,
	materialWidth: number,
	pixelsPerMM: number,
	canvasColors: CanvasColors,
};
export default function Board(props: Props) {
	const {
		viewWidth,
		viewHeight,
		materialWidth,
		pixelsPerMM,
		canvasColors,
	} = props;

	const pxWidth = materialWidth * pixelsPerMM;

	return (
		<Rect
			x={(viewWidth - pxWidth) / 2}
			y={viewHeight * .2}
			width={pxWidth}
			height={viewHeight * .8}
			fill={canvasColors.board}
		/>
	);
}
