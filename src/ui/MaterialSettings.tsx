import {useStore} from '../context/store';
import {setMaterial} from '../context/general';

import {useLimits} from '../util/limits';

import {Form, FormHeader, FormSection, TextRow} from './Form';

export default function MaterialSettings() {
	const [{general: {kind, joint, material}}, dispatch] = useStore();
	const {material: {maxThickness}} = useLimits();

	let thicknessLabel = 'Material Thickness';
	let lengthInput = null;
	if (kind === 'half') {
		thicknessLabel = joint === 'box' ? 'Joint Depth' : 'Dovetail Depth';
		lengthInput = (
			<TextRow
				id="length_input"
				label="Material Thickness"
				value={material.dovetailLength}
				onChange={(l) => dispatch(setMaterial({dovetailLength: l}))}
			/>
		);
	}

	return (
		<div className="Settings Block">
			<Form>
				<FormHeader>Material</FormHeader>
				<FormSection>
					{lengthInput}
					<TextRow
						id="thickness_input"
						label={thicknessLabel}
						value={material.thickness}
						max={maxThickness}
						min={1}
						onChange={(t) => dispatch(setMaterial({thickness: t}))}
					/>
					<TextRow
						id="width_input"
						label="Material Width"
						value={material.width}
						onChange={(width) => dispatch(setMaterial({width}))}
					/>
				</FormSection>
			</Form>
		</div>
	);
}
