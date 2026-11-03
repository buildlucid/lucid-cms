import executeHooks from "./execute-hooks.js";
import type {
	HookExecutionKindMap,
	PluginHookEvents,
	PluginHookEventsDefinition,
} from "./types.js";

/**
 * Defines the hook events a plugin runs, so projects can subscribe with `defineHook`
 * and deploys can trigger on them. Declare the same events in `PluginHookEvents`
 * from the plugin's public entry point, add the definition to the plugin's
 * `hookEvents`, and run events with `execute`.
 *
 * @example
 * ```ts
 * const hookEvents = defineHookEvents({
 *   key: "pages",
 *   events: { afterRebuildPaths: "effect" },
 * });
 *
 * declare module "@lucidcms/core/types" {
 *   interface PluginHookEvents {
 *     pages: {
 *       afterRebuildPaths: EffectHookEvent<Record<string, never>, { collectionKeys: string[] }>;
 *     };
 *   }
 * }
 *
 * await hookEvents.execute(context, "afterRebuildPaths", {
 *   meta: {},
 *   data: { collectionKeys: ["page"] },
 * });
 * ```
 */
const defineHookEvents = <
	const TKey extends keyof PluginHookEvents,
>(definition: {
	key: TKey;
	events: HookExecutionKindMap[TKey];
}): PluginHookEventsDefinition<TKey> => ({
	type: "hook-events-definition",
	key: definition.key,
	events: definition.events,
	execute: (context, event, payload) =>
		executeHooks(
			context,
			{ service: definition.key, event, config: context.config },
			payload,
		),
});

export default defineHookEvents;
