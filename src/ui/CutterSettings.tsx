import {useStore} from '../context/store';
import {setCutter} from '../context/general';

import {Form, FormHeader, FormSection, SelectRow, TextRow} from './Form';

import type {Cutter} from '../context/general';

const CUSTOM = 'custom';
type Preset = {
	value: string,
	label: string,
	cutter: Pick<Cutter, 'dovetailDiameter' | 'height' | 'angle'>,
};
const PRESETS: Preset[] = [
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

function matchingPreset(cutter: Cutter): string {
	const matches = (a: number, b: number) => Math.abs(a - b) < 0.001;
	for (const preset of PRESETS) {
		if (
			matches(cutter.dovetailDiameter, preset.cutter.dovetailDiameter)
				&& matches(cutter.height, preset.cutter.height)
				&& matches(cutter.angle, preset.cutter.angle)
		) {
			return preset.value;
		}
	}
	return CUSTOM;
}

export default function CutterSettings() {
	const [{general: {kind, cutter}}, dispatch] = useStore();

	function onPresetChange(value: string) {
		const preset = PRESETS.find((p) => p.value === value);
		if (preset) {
			dispatch(setCutter(preset.cutter));
		}
	}

	const presetOptions = [
		...PRESETS.map(({value, label}) => ({value, label})),
		{value: CUSTOM, label: 'Custom'},
	];

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
					<SelectRow
						id="bit_preset_input"
						label="Bit Preset"
						options={presetOptions}
						value={matchingPreset(cutter)}
						onChange={onPresetChange}
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
