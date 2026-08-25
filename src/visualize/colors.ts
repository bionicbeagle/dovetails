import {ThemePreference} from '../theme';

// The pin and half-pin shapes "cut away" the board by painting over
// it with the canvas background color, so the visualizer background
// and the mask fill must always be the same color.
export type CanvasColors = {
	background: string,
	guide: string,
	centerGuide: string,
	shoulder: string,
	selectedPin: string,
	// Drawn over the solid part of the board, so it needs to
	// contrast with the wood color rather than the background
	dimension: string,
	// Drawn above the board, over the canvas background
	topDimension: string,
	// Wood shade for the mating board, distinct from the board fill
	matingBoard: string,
};

type EffectiveTheme = ThemePreference.Light | ThemePreference.Dark;
export const CANVAS_COLORS: {[theme in EffectiveTheme]: CanvasColors} = {
	[ThemePreference.Light]: {
		background: '#ffffff',
		guide: 'gray',
		centerGuide: 'black',
		shoulder: 'black',
		selectedPin: 'blue',
		dimension: '#2a1c0e',
		topDimension: '#333333',
		matingBoard: '#8d6b45',
	},
	[ThemePreference.Dark]: {
		background: '#2b2b28',
		guide: '#8a8a8a',
		centerGuide: '#e0e0e0',
		shoulder: '#e0e0e0',
		selectedPin: '#6ea8ff',
		dimension: '#2a1c0e',
		topDimension: '#c8c8c8',
		matingBoard: '#8d6b45',
	},
};
