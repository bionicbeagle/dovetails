import {z} from 'zod';

import {Anchor} from '../render/base';

export const ContextTemplateSchema = z.object(
	{
		anchor: z.nativeEnum(Anchor),
		glueGap: z.number(),
		extraDepth: z.number(),
	},
);
export type ContextTemplate = z.infer<typeof ContextTemplateSchema>;

export const initTemplate: ContextTemplate = {
	anchor: Anchor.BottomLeft,
	glueGap: 0.02,
	extraDepth: 0.1,
};

enum Action {
	Update = 'update',
}

export function reduceTemplate(
	state: ContextTemplate,
	action: TemplateAction,
): ContextTemplate {
	switch (action.type) {
		case Action.Update:
			return {...state, ...action.delta};
	}
	return state;
}

type UpdateAction = {
	store: 'template',
	type: Action.Update,
	delta: Partial<ContextTemplate>,
};
export function update(delta: Partial<ContextTemplate>): UpdateAction {
	return {store: 'template', type: Action.Update, delta};
}

export type TemplateAction = UpdateAction;
