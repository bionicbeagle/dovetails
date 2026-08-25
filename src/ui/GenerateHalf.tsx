import {useState} from 'react';
import {Link} from 'react-router-dom';

import {useStore} from '../context/store';
import {renderHalfTailsA, renderHalfTailsB} from '../render/tails';
import {renderHalfPinsA, renderHalfPinsB} from '../render/pins';

import {Form, FormHeader, FormSection, TextRow} from './Form';

function dataURI(svg: string) {
	return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export default function GenerateHalf() {
	const [store] = useStore();
	const [glueGap, setGlueGap] = useState(0.02);
	const [extraDepth, setExtraDepth] = useState(0.1);

	const shareLink = {
		path: '/',
		search: `?s=${btoa(JSON.stringify(store))}`,
	};

	const pinsA = renderHalfPinsA(store, glueGap, extraDepth);
	const pinsB = renderHalfPinsB(store, glueGap, extraDepth);

	return (
		<div className="Block Settings">
			<Form>
				<FormHeader>Template</FormHeader>
				<FormSection>
					<TextRow
						id="glue_input"
						label="Glue Gap"
						min={0}
						value={glueGap}
						onChange={setGlueGap}
					/>
					<TextRow
						id="extra_depth_input"
						label="Extra Depth"
						min={0}
						value={extraDepth}
						onChange={setExtraDepth}
					/>
				</FormSection>
				<span>Download</span>
				<FormSection>
					<div className="TwoButtonRow">
						<a
							href={dataURI(renderHalfTailsA(store))}
							download="tails_a.svg"
							title={
								'Tails template for one corner of the '
									+ 'assembly; pairs with Pins (A)'
							}>
							Tails (A)
						</a>
						<a
							href={dataURI(renderHalfTailsB(store))}
							download="tails_b.svg"
							title={
								'Mirrored tails template for the '
									+ 'opposite corner; pairs with '
									+ 'Pins (B)'
							}>
							Tails (B)
						</a>
					</div>
					<div className="TwoButtonRow">
						<a
							href={dataURI(pinsA)}
							download="pins_a.svg"
							title={
								'Pins template for one corner of the '
									+ 'assembly; pairs with Tails (A)'
							}>
							Pins (A)
						</a>
						<a
							href={dataURI(pinsB)}
							download="pins_b.svg"
							title={
								'Mirrored pins template for the '
									+ 'opposite corner; pairs with '
									+ 'Tails (B)'
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
