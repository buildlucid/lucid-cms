import type { CoreHookExecutionKindMap } from "./types.js";

/**
 * Classifies core events as transforms or effects. Transforms use sequential Immer drafts; effects
 * run in order. Plugins use `defineHookEvents`.
 */
export const hookExecutionKinds: CoreHookExecutionKindMap = {
	documents: {
		afterChange: "effect",
		beforeUpsert: "transform",
		afterUpsert: "effect",
		afterFetch: "transform",
		beforeDelete: "effect",
		beforeUnpublish: "effect",
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
};
