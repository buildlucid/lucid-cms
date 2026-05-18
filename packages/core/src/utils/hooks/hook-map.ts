import type { HookServiceHandlers } from "../../types/hooks.js";
import type { HookExecutionMode } from "./types.js";

/**
 * Defines how each hook event combines multiple handlers while keeping callers
 * on the single `executeHooks` interface.
 */
export const hookExecutionModes = {
	documents: {
		beforeUpsert: "merge",
		afterUpsert: "merge",
		afterFetch: "pipeline",
		beforeDelete: "merge",
		afterDelete: "merge",
		versionPromote: "merge",
	},
} satisfies {
	[S in keyof HookServiceHandlers]: {
		[E in keyof HookServiceHandlers[S]]: HookExecutionMode;
	};
};
