import {useStore} from '../context/store';
import {From, FromSchema, update} from '../context/guides';

import {
	Form,
	FormHeader,
	FormSection,
	CheckRow,
	SelectRow,
	TextRow,
} from './Form';

export default function GuideSettings() {
	const [
		{
			general: {cutter: {dovetailDiameter}},
			guides: {
				enabled,
				spacing,
				from,
				dimensions,
				matingBoard,
				preview3d,
			},
		},
		dispatch,
	] = useStore();

	let extraOptions = null;
	if (enabled) {
		const fromOptions = [
			{label: From.Left, value: 'left'},
			{label: From.Center, value: 'center'},
			{label: From.Right, value: 'right'},
		];

		extraOptions = (
			<FormSection>
				<TextRow
					id="spacing_input"
					label="Guide Spacing"
					value={spacing}
					onChange={(spacing) => dispatch(update({spacing}))}
				/>
				<SelectRow
					id="from_input"
					label="Guides From"
					options={fromOptions}
					value={from}
					onChange={updateFrom}
				/>
			</FormSection>
		);
	}

	function updateFrom(newFrom: string) {
		dispatch(update({from: FromSchema.parse(newFrom)}));
	}

	function updateEnabled(newValue: boolean) {
		if (newValue && spacing === 0) {
			dispatch(update({enabled: true, spacing: dovetailDiameter}));
		} else {
			dispatch(update({enabled: newValue}));
		}
	}

	return (
		<div className="Settings Block">
			<Form>
				<FormHeader>Visualization</FormHeader>
				<FormSection>
					<CheckRow
						id="enabled_input"
						label="Enable Guides"
						checked={enabled}
						onChange={updateEnabled}
					/>
				</FormSection>
				{extraOptions}
				<FormSection>
					<CheckRow
						id="dimensions_input"
						label="Show Dimensions"
						checked={dimensions}
						onChange={
							(dimensions) => dispatch(update({dimensions}))
						}
					/>
					<CheckRow
						id="mating_board_input"
						label="Show Mating Board"
						checked={matingBoard}
						onChange={
							(matingBoard) => dispatch(update({matingBoard}))
						}
					/>
					<CheckRow
						id="preview3d_input"
						label="3D Preview"
						checked={preview3d}
						onChange={
							(preview3d) => dispatch(update({preview3d}))
						}
					/>
				</FormSection>
			</Form>
		</div>
	);
}
