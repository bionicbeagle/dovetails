import {useStore} from '../context/store';
import {
	Unit,
	Kind,
	Joint,
	UnitSchema,
	KindSchema,
	JointSchema,
	setJointType,
	setUnit,
} from '../context/general';

import {Form, FormSection, SelectRow} from './Form';

export default function GlobalSettings() {
	const [{general: {kind, joint, unit}}, dispatch] = useStore();

	const jointTypeOptions = [
		{
			value: `${Kind.Through}:${Joint.Dovetail}`,
			label: 'Through Dovetail',
		},
		{
			value: `${Kind.Half}:${Joint.Dovetail}`,
			label: 'Half-Blind Dovetail',
		},
		{
			value: `${Kind.Through}:${Joint.Box}`,
			label: 'Through Box Joint',
		},
		{
			value: `${Kind.Half}:${Joint.Box}`,
			label: 'Half-Blind Box Joint',
		},
	];

	const unitOptions = [
		{value: Unit.MM, label: 'mm'},
		{value: Unit.Inch, label: 'inch'},
	];

	function updateJointType(value: string) {
		const [newKind, newJoint] = value.split(':');
		dispatch(setJointType(
			KindSchema.parse(newKind),
			JointSchema.parse(newJoint),
		));
	}

	function updateUnit(unit: string) {
		dispatch(setUnit(UnitSchema.parse(unit)));
	}

	return (
		<div className="Settings Block">
			<Form>
				<FormSection>
					<SelectRow
						id="type_input"
						label="Joint Type"
						options={jointTypeOptions}
						value={`${kind}:${joint}`}
						onChange={updateJointType}
					/>
					<SelectRow
						id="units_input"
						label="Units"
						options={unitOptions}
						value={unit}
						onChange={updateUnit}
					/>
				</FormSection>
			</Form>
		</div>
	);
}
