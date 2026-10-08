import type {
	HookExecutionKind,
	HookExecutionKindMap,
	HookServiceHandlers,
} from "./types.js";

/**
 * Defines whether each hook event transforms request data or runs only for
 * side effects. Transform hooks run sequentially with Immer-drafted data while
 * effect hooks keep the lightweight fire-in-order behaviour.
 */
export const hookExecutionKinds: {
	[S in keyof HookServiceHandlers]: {
		[E in keyof HookServiceHandlers[S]]: HookExecutionKind;
	};
} = {
	documents: {
		afterChange: "effect",
		beforeUpsert: "transform",
		afterUpsert: "effect",
		afterFetch: "transform",
		beforeDelete: "effect",
		afterRestore: "effect",
		afterDelete: "effect",
		versionPromote: "effect",
		versionCapture: "effect",
	},
	documentWorkflows: {
		afterUpdate: "effect",
	},
	requests: {
		check: "transform",
		completed: "effect",
		documentRemoved: "effect",
	},
	notifications: {
		beforeSend: "transform",
		afterSend: "effect",
	},
	media: {
		afterChange: "effect",
		afterRestore: "effect",
		afterCreate: "effect",
		afterUpdate: "effect",
		afterDelete: "effect",
	},
	agent: {
		runFinished: "effect",
	},
} satisfies HookExecutionKindMap;
