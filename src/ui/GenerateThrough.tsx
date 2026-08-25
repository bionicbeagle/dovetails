import {Link} from 'react-router-dom';
import {z} from 'zod';

import {useStore} from '../context/store';
import {update} from '../context/template';
import {Anchor} from '../render/base';
import {renderThroughTails} from '../render/tails';
import {renderThroughPinsA, renderThroughPinsB} from '../render/pins';

import {Form, FormHeader, FormSection, SelectRow} from './Form';

function dataURI(svg: string) {
	return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export default function GenerateThrough() {
	const [store, dispatch] = useStore();
	const {template: {anchor}} = store;

	const AnchorSchema = z.nativeEnum(Anchor);
	function checkAnchor(anchor: string) {
		dispatch(update({anchor: AnchorSchema.parse(anchor)}));
	}

	const shareLink = {
		path: '/',
		search: `?s=${btoa(JSON.stringify(store))}`,
	};

	const anchorOptions = [
		{value: Anchor.BottomLeft, label: 'Bottom Left'},
		{value: Anchor.BottomRight, label: 'Bottom Right'},
		{value: Anchor.TopRight, label: 'Top Right'},
		{value: Anchor.TopLeft, label: 'Top Left'},
	];

	return (
		<div className="Block Settings">
			<Form>
				<FormHeader>Template</FormHeader>
				<FormSection>
					<SelectRow
						id="anchor_input"
						label="Anchor Position"
						options={anchorOptions}
						value={anchor}
						onChange={checkAnchor}
					/>
				</FormSection>
				<span>Download</span>
				<FormSection>
					<div className="ThreeButtonRow">
						<a
							href={dataURI(renderThroughTails(store, anchor))}
							download="tails.svg"
							title={
								'Template for the tails board, usable '
									+ 'on both of its sides'
							}>
							Tails
						</a>
						<a
							href={dataURI(renderThroughPinsA(store, anchor))}
							download="pins_a.svg"
							title={
								'Template for one side of the pins '
									+ 'board; cut Pins (B) from the '
									+ 'opposite side'
							}>
							Pins (A)
						</a>
						<a
							href={dataURI(renderThroughPinsB(store, anchor))}
							download="pins_b.svg"
							title={
								'Template for the opposite side of the '
									+ 'pins board, completing the cuts '
									+ 'made with Pins (A)'
							}>
							Pins (B)
						</a>
					</div>
				</FormSection>
				<span>Share</span>
				<div className="OneButtonRow">
					<Link to={shareLink}>Link to this design</Link>
				</div>
			</Form>
		</div>
	);
}
