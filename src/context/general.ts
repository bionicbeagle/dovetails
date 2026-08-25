import {z} from 'zod';

import type {Store} from './store';

export enum Kind {
	Through = 'through',
	Half = 'half',
}
export const KindSchema = z.nativeEnum(Kind);

export enum Joint {
	Dovetail = 'dovetail',
	Box = 'box',
}
export const JointSchema = z.nativeEnum(Joint);

export enum Unit {
	MM = 'mm',
	Inch = 'inch',
};
export const UnitSchema = z.nativeEnum(Unit);

const CutterSchema = z.object(
	{
		dovetailDiameter: z.number(),
		straightDiameter: z.number(),
		height: z.number(),
		angle: z.number(),
	},
);
export type Cutter = z.infer<typeof CutterSchema>;

const MaterialSchema = z.object(
	{
		thickness: z.number(),
		width: z.number(),
		dovetailLength: z.number(),
	},
);
export type Material = z.infer<typeof MaterialSchema>;

export const ContextGeneralSchema = z.object(
	{
		kind: KindSchema,
		joint: JointSchema,
		unit: UnitSchema,
		cutter: CutterSchema,
		material: MaterialSchema,
	},
);
export type ContextGeneral = z.infer<typeof ContextGeneralSchema>;


enum Action {
	SetKind = 'setKind',
	SetJointType = 'setJointType',
	SetUnit = 'setUnit',
	SetCutter = 'setCutter',
	SetMaterial = 'setMaterial',
}

export const initGeneral: ContextGeneral = {
	kind: Kind.Through,
	joint: Joint.Dovetail,
	unit: Unit.MM,
	cutter: {
		dovetailDiameter: 12.7,
		straightDiameter: 6.35,
		height: 12.7,
		angle: 14,
	},
	material: {
		thickness: 10,
		width: 100,
		dovetailLength: 10,
	},
};

export function reduceGeneral(state: ContextGeneral, action: GeneralAction) {
	switch (action.type) {
		case Action.SetKind:
			let materialComponent = {};
			if (action.kind === 'half') {
				materialComponent = {
					material: {
						...state.material,
						thickness: state.material.thickness * 2 / 3,
						dovetailLength: state.material.thickness,
					},
				};
			} else {
				materialComponent = {
					material: {
						...state.material,
						thickness: state.material.dovetailLength,
					},
				};
			}
			return {
				...state,
				kind: action.kind,
				...materialComponent,
			};
		case Action.SetJointType: {
			let next: ContextGeneral = state;
			if (action.kind !== state.kind) {
				next = reduceGeneral(state, setKind(action.kind));
			}

			// Leaving box mode with the angle still forced to zero
			// wouldn't be a dovetail, so restore the default angle
			let cutter = next.cutter;
			if (
				action.joint === Joint.Dovetail
					&& state.joint === Joint.Box
					&& cutter.angle === 0
			) {
				cutter = {...cutter, angle: initGeneral.cutter.angle};
			}

			return {...next, joint: action.joint, cutter};
		}
		case Action.SetUnit:
			return {...state, unit: action.unit};
		case Action.SetCutter:
			return {...state, cutter: {...state.cutter, ...action.cutter}};
		case Action.SetMaterial:
			return {
				...state,
				material: {...state.material, ...action.material},
			};
		default:
			return state;
	}
}

type KindAction = {store: 'general', type: Action.SetKind, kind: Kind};
export function setKind(kind: Kind): KindAction {
	return {store: 'general', type: Action.SetKind, kind};
}

type JointTypeAction = {
	store: 'general',
	type: Action.SetJointType,
	kind: Kind,
	joint: Joint,
};
export function setJointType(kind: Kind, joint: Joint): JointTypeAction {
	return {store: 'general', type: Action.SetJointType, kind, joint};
}

// A box joint is a dovetail joint with no flare, cut entirely with
// the straight bit, so in box mode the dovetail cutter settings
// mirror the straight bit
export function validateJoint(store: Store): Store {
	const {general} = store;
	if (general.joint !== Joint.Box) {
		return store;
	}

	const {cutter} = general;
	if (
		cutter.angle === 0
			&& cutter.dovetailDiameter === cutter.straightDiameter
	) {
		return store;
	}
	return {
		...store,
		general: {
			...general,
			cutter: {
				...cutter,
				angle: 0,
				dovetailDiameter: cutter.straightDiameter,
			},
		},
	};
}

type UnitAction = {store: 'general', type: Action.SetUnit, unit: Unit};
export function setUnit(unit: Unit): UnitAction {
	return {store: 'general', type: Action.SetUnit, unit};
}

type CutterAction = {
	store: 'general',
	type: Action.SetCutter,
	cutter: Partial<Cutter>,
};
export function setCutter(cutter: Partial<Cutter>): CutterAction {
	return {store: 'general', type: Action.SetCutter, cutter};
}

type MaterialAction = {
	store: 'general',
	type: Action.SetMaterial,
	material: Partial<Material>,
};
export function setMaterial(material: Partial<Material>): MaterialAction {
	return {store: 'general', type: Action.SetMaterial, material};
}

export type GeneralAction = (
	KindAction |
		JointTypeAction |
		UnitAction |
		CutterAction |
		MaterialAction
);
