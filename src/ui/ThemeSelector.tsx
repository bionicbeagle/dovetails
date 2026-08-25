import {useTheme, ThemePreference} from '../theme';

export default function ThemeSelector() {
	const [preference, setPreference] = useTheme();

	return (
		<label className="ThemeSelector">
			Theme:{' '}
			<select
				value={preference}
				onChange={(e) => setPreference(
					e.target.value as ThemePreference,
				)}
			>
				<option value={ThemePreference.System}>System</option>
				<option value={ThemePreference.Light}>Light</option>
				<option value={ThemePreference.Dark}>Dark</option>
			</select>
		</label>
	);
}
