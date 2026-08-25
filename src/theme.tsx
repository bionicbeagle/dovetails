import {createContext, useContext, useEffect, useState} from 'react';

export enum ThemePreference {
	System = 'system',
	Light = 'light',
	Dark = 'dark',
}

const STORAGE_KEY = 'theme_preference';

function loadPreference(): ThemePreference {
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (
			stored === ThemePreference.Light
				|| stored === ThemePreference.Dark
		) {
			return stored;
		}
	} catch {}
	return ThemePreference.System;
}

type TContext = [ThemePreference, (preference: ThemePreference) => void];
const Context = createContext<TContext>([ThemePreference.System, () => {}]);

export function useTheme(): TContext {
	return useContext(Context);
}

// The theme that's actually in effect, with the System preference
// resolved against the OS setting. Needed by the Konva canvas, which
// can't use CSS variables.
export function useEffectiveTheme(): ThemePreference.Light | ThemePreference.Dark {
	const [preference] = useTheme();
	const [systemDark, setSystemDark] = useState(
		() => window.matchMedia('(prefers-color-scheme: dark)').matches,
	);

	useEffect(
		() => {
			const query = window.matchMedia('(prefers-color-scheme: dark)');
			const listener = (e: MediaQueryListEvent) => setSystemDark(
				e.matches,
			);
			query.addEventListener('change', listener);
			return () => query.removeEventListener('change', listener);
		},
		[],
	);

	if (preference !== ThemePreference.System) {
		return preference;
	}
	return systemDark ? ThemePreference.Dark : ThemePreference.Light;
}

type Props = {children: React.ReactNode | React.ReactNode[]};
export function ThemeProvider({children}: Props) {
	const [preference, setPreference] = useState<ThemePreference>(
		loadPreference,
	);

	useEffect(
		() => {
			const root = document.documentElement;
			if (preference === ThemePreference.System) {
				root.removeAttribute('data-theme');
			} else {
				root.setAttribute('data-theme', preference);
			}

			try {
				if (preference === ThemePreference.System) {
					window.localStorage.removeItem(STORAGE_KEY);
				} else {
					window.localStorage.setItem(STORAGE_KEY, preference);
				}
			} catch {}
		},
		[preference],
	);

	return (
		<Context.Provider value={[preference, setPreference]}>
			{children}
		</Context.Provider>
	);
}
