import {useStore} from '../context/store';
import {setCutter} from '../context/general';

import {Form, FormHeader, FormSection, TextRow} from './Form';

export default function CutterSettings() {
	const [{general: {kind, cutter}}, dispatch] = useStore();

	let straightInput = null;
	if (kind === 'through') {
		straightInput = (
			<TextRow
				id="straight_diameter_input"
				label="Straight Diameter"
				value={cutter.straightDiameter}
				onChange={
					(straightDiameter) => dispatch(
						setCutter({straightDiameter}),
					)
				}
			/>
		);
	}

	return (
		<div className="Settings Block">
			<Form>
				<FormHeader>Cutter</FormHeader>
				<FormSection>
					<TextRow
						id="dovetail_diameter_input"
						label="Dovetail Diameter"
						value={cutter.dovetailDiameter}
						onChange={
							(dovetailDiameter) => dispatch(
								setCutter({dovetailDiameter}),
							)
						}
					/>
					{straightInput}
					<TextRow
						id="height_input"
						label="Cutter Height"
						value={cutter.height}
						onChange={(height) => dispatch(setCutter({height}))}
					/>
					<TextRow
						id="angle_input"
						label="Cutter Angle (deg)"
						value={cutter.angle}
						onChange={(angle) => dispatch(setCutter({angle}))}
						dimensionless
					/>
				</FormSection>
			</Form>
		</div>
	);
}
