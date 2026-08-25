import {createContext, useContext, useReducer} from 'react';
import merge from '../util/merge';
import {useLocation} from 'react-router-dom';
import {z} from 'zod';

import {
	initGeneral,
	reduceGeneral,
	validateJoint,
	ContextGeneralSchema,
} from './general';
import {initGuides, reduceGuides, ContextGuidesSchema} from './guides';
import {
	initHalfPins,
	reduceHalfPins,
	validateHalfPins,
	ContextHalfPinsSchema,
} from './halfPins';
import {initPins, reducePins, validatePins, ContextPinsSchema} from './pins';
import {
	initTemplate,
	reduceTemplate,
	ContextTemplateSchema,
} from './template';

import type {GeneralAction} from './general';
import type {GuidesAction} from './guides';
import type {HalfPinsAction} from './halfPins';
import type {PinsAction} from './pins';
import type {TemplateAction} from './template';

const StoreSchema = z.object(
	{
		general: ContextGeneralSchema,
		guides: ContextGuidesSchema,
		halfPins: ContextHalfPinsSchema,
		pins: ContextPinsSchema,
		template: ContextTemplateSchema,
	},
);
export type Store = z.infer<typeof StoreSchema>;

const initStore = {
	general: initGeneral,
	guides: initGuides,
	halfPins: initHalfPins,
	pins: initPins,
	template: initTemplate,
};

type Action = (
	GeneralAction |
		GuidesAction |
		HalfPinsAction |
		PinsAction |
		TemplateAction
);

type HistoryAction = {store: 'history', type: 'undo' | 'redo'};
export function undo(): HistoryAction {
	return {store: 'history', type: 'undo'};
}
export function redo(): HistoryAction {
	return {store: 'history', type: 'redo'};
}

type TContext = [
	Store,
	React.Dispatch<Action | HistoryAction>,
	{canUndo: boolean, canRedo: boolean},
];
const Context = createContext<TContext>(
	[initStore, () => {}, {canUndo: false, canRedo: false}],
);
const VALIDATIONS = [
	validateJoint,
	validatePins,
	validateHalfPins,
];

export function useStore(): TContext {
	return useContext(Context);
}

function reducePresent(state: Store, action: Action): Store {
	let newState = state;

	switch (action.store) {
		case 'general':
			newState = {
				...state,
				general: reduceGeneral(state.general, action),
			};
			break;
		case 'guides':
			newState = {
				...state,
				guides: reduceGuides(state.guides, action),
			};
			break;
		case 'pins':
			newState = {
				...state,
				pins: reducePins(state.pins, action),
			};
			break;
		case 'halfPins':
			newState = {
				...state,
				halfPins: reduceHalfPins(state.halfPins, action),
			};
			break;
		case 'template':
			newState = {
				...state,
				template: reduceTemplate(state.template, action),
			};
			break;
		default:
			return state;
	}

	for (const validation of VALIDATIONS) {
		newState = validation(newState);
	}
	return newState;
}

const MAX_HISTORY = 100;
const MERGE_WINDOW_MS = 1000;
const GUIDES_VIEW_KEYS = ['dimensions', 'matingBoard', 'preview3d'];

// Changes that only affect what's displayed, not the design itself,
// shouldn't become undo steps of their own
function isEphemeral(action: Action): boolean {
	switch (action.store) {
		case 'general':
			return 'unit' in action;
		case 'guides':
			return Object.keys(action.delta).every(
				(key) => GUIDES_VIEW_KEYS.includes(key),
			);
		case 'pins':
			return 'delta' in action && Object.keys(action.delta).every(
				(key) => key === 'selected',
			);
		case 'template':
			return true;
		default:
			return false;
	}
}

// Successive edits to the same fields (e.g. keystrokes in one text
// input) merge into a single undo step while they arrive quickly
function signature(action: Action): string {
	const parts: string[] = [action.store, String(action.type)];
	for (const [key, value] of Object.entries(action)) {
		if (
			key !== 'store'
				&& key !== 'type'
				&& value
				&& typeof value === 'object'
				&& !Array.isArray(value)
		) {
			parts.push(key, ...Object.keys(value).sort());
		}
	}
	return parts.join('|');
}

// Undo restores the design but keeps the current view settings
// (units and visualization toggles) rather than reverting them
function preserveView(target: Store, current: Store): Store {
	return {
		...target,
		general: {...target.general, unit: current.general.unit},
		guides: {
			...target.guides,
			dimensions: current.guides.dimensions,
			matingBoard: current.guides.matingBoard,
			preview3d: current.guides.preview3d,
		},
	};
}

type History = {
	past: Store[],
	present: Store,
	future: Store[],
	lastSignature: string | null,
	lastTime: number,
};

function reduceHistory(
	state: History,
	action: Action | HistoryAction,
): History {
	const {past, present, future} = state;

	if (action.store === 'history') {
		if (action.type === 'undo') {
			if (past.length === 0) {
				return state;
			}
			return {
				past: past.slice(0, -1),
				present: preserveView(past[past.length - 1], present),
				future: [present, ...future],
				lastSignature: null,
				lastTime: 0,
			};
		}

		if (future.length === 0) {
			return state;
		}
		return {
			past: [...past, present],
			present: preserveView(future[0], present),
			future: future.slice(1),
			lastSignature: null,
			lastTime: 0,
		};
	}

	const newPresent = reducePresent(present, action);
	if (isEphemeral(action)) {
		return {...state, present: newPresent};
	}

	const newSignature = signature(action);
	const now = Date.now();
	if (
		newSignature === state.lastSignature
			&& now - state.lastTime < MERGE_WINDOW_MS
	) {
		return {...state, present: newPresent, lastTime: now};
	}

	return {
		past: [...past, present].slice(-MAX_HISTORY),
		present: newPresent,
		future: [],
		lastSignature: newSignature,
		lastTime: now,
	};
}

type Props = {children: React.ReactNode | React.ReactNode[]};
export function StoreProvider({children}:  Props) {
	const sharedState = new URLSearchParams(useLocation().search).get('s');
	let initialState = {
		general: initGeneral,
		guides: initGuides,
		halfPins: initHalfPins,
		pins: initPins,
		template: initTemplate,
	};
	if (sharedState) {
		initialState = merge(
			initialState,
			StoreSchema.deepPartial().parse(JSON.parse(atob(sharedState))),
		);
	}

	const [history, dispatch] = useReducer(
		reduceHistory,
		{
			past: [],
			present: initialState,
			future: [],
			lastSignature: null,
			lastTime: 0,
		},
	);

	return (
		<Context.Provider
			value={[
				history.present,
				dispatch,
				{
					canUndo: history.past.length > 0,
					canRedo: history.future.length > 0,
				},
			]}
		>
			{children}
		</Context.Provider>
	);
}
