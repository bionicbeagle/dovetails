import {useStore} from '../context/store';
import {
	Unit,
	Kind,
	UnitSchema,
	KindSchema,
	setKind,
	setUnit,
} from '../context/general';

import {Form, FormSection, SelectRow} from './Form';

export default function GlobalSettings() {
	const [{general: {kind, unit}}, dispatch] = useStore();

	const kindOptions = [
		{value: Kind.Through, label: 'Through'},
		{value: Kind.Half, label: 'Half-Blind'},
	];

	const unitOptions = [
		{value: Unit.MM, label: 'mm'},
		{value: Unit.Inch, label: 'inch'},
	];

	function updateKind(kind: string) {
		dispatch(setKind(KindSchema.parse(kind)));
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
						label="Dovetail Type"
						options={kindOptions}
						value={kind}
						onChange={updateKind}
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
