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
export const hookExecutionKinds = {
	documents: {
		beforeUpsert: "transform",
		afterUpsert: "effect",
		afterFetch: "transform",
		beforeDelete: "effect",
		afterDelete: "effect",
		versionPromote: "effect",
	},
} satisfies {
	[S in keyof HookServiceHandlers]: {
		[E in keyof HookServiceHandlers[S]]: HookExecutionKind;
	};
} & HookExecutionKindMap;
