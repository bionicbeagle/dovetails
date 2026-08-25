import {useStore} from '../context/store';
import {setCutter} from '../context/general';

import {Form, FormHeader, FormSection, SelectRow, TextRow} from './Form';

import type {Cutter} from '../context/general';

const CUSTOM = 'custom';
type Preset = {
	value: string,
	label: string,
	cutter: Partial<Cutter>,
};

const DOVETAIL_PRESETS: Preset[] = [
	{
		value: 'default',
		label: 'Default bit',
		cutter: {dovetailDiameter: 12.7, height: 12.7, angle: 14},
	},
	{
		value: 'shaper15',
		label: 'Shaper 15°',
		cutter: {dovetailDiameter: 13.8, height: 13.5, angle: 15},
	},
	{
		value: 'festoolD16',
		label: 'Festool D16/13,5/15°',
		cutter: {dovetailDiameter: 16, height: 13.5, angle: 15},
	},
	{
		value: 'festoolD20_15',
		label: 'Festool D20/17/15°',
		cutter: {dovetailDiameter: 20, height: 17, angle: 15},
	},
	{
		value: 'festoolD20_10',
		label: 'Festool D20/26/10°',
		cutter: {dovetailDiameter: 20, height: 26, angle: 10},
	},
];

const STRAIGHT_PRESETS: Preset[] = [
	{
		value: 'default',
		label: 'Default bit (1/4")',
		cutter: {straightDiameter: 6.35},
	},
	{
		value: 'shaper8th',
		label: 'Shaper 1/8"',
		cutter: {straightDiameter: 3.175},
	},
	{
		value: 'shaper6mm',
		label: 'Shaper 6 mm',
		cutter: {straightDiameter: 6},
	},
	{
		value: 'shaper8mm',
		label: 'Shaper 8 mm',
		cutter: {straightDiameter: 8},
	},
];

function matchingPreset(cutter: Cutter, presets: Preset[]): string {
	for (const preset of presets) {
		const matches = Object.entries(preset.cutter).every(
			([key, value]) => Math.abs(
				cutter[key as keyof Cutter] - value,
			) < 0.001,
		);
		if (matches) {
			return preset.value;
		}
	}
	return CUSTOM;
}

function presetOptions(presets: Preset[]) {
	return [
		...presets.map(({value, label}) => ({value, label})),
		{value: CUSTOM, label: 'Custom'},
	];
}

export default function CutterSettings() {
	const [{general: {kind, cutter}}, dispatch] = useStore();

	function onPresetChange(presets: Preset[], value: string) {
		const preset = presets.find((p) => p.value === value);
		if (preset) {
			dispatch(setCutter(preset.cutter));
		}
	}

	let straightSection = null;
	if (kind === 'through') {
		straightSection = (
			<FormSection>
				<SelectRow
					id="straight_preset_input"
					label="Straight Bit"
					options={presetOptions(STRAIGHT_PRESETS)}
					value={matchingPreset(cutter, STRAIGHT_PRESETS)}
					onChange={
						(value) => onPresetChange(STRAIGHT_PRESETS, value)
					}
				/>
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
			</FormSection>
		);
	}

	return (
		<div className="Settings Block">
			<Form>
				<FormHeader>Cutter</FormHeader>
				<FormSection>
					<SelectRow
						id="bit_preset_input"
						label="Dovetail Bit"
						options={presetOptions(DOVETAIL_PRESETS)}
						value={matchingPreset(cutter, DOVETAIL_PRESETS)}
						onChange={
							(value) => onPresetChange(DOVETAIL_PRESETS, value)
						}
					/>
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
				{straightSection}
			</Form>
		</div>
	);
}
