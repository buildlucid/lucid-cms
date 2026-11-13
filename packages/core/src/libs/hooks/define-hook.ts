import type { AllHooks } from "./types.js";

/**
 * Defines a lifecycle hook with handler arguments inferred from its service and event.
 * Add it to `config.hooks`.
 * Lower order values execute first; the default is zero.
 * Transform hooks may mutate the data draft or return replacement data. Effect hooks return nothing.
 * Throw a LucidError to fail the operation the hook runs in.
 * A hook to an event no configured plugin registers fails startup, unless it sets `optional: true`,
 * which leaves it out instead. Optional hooks let one plugin subscribe to another plugin's events
 * when that plugin may not be installed: import its types with `import type` so its events are typed
 * without loading it at runtime.
 *
 * @example
 * ```ts
 * const logMedia = defineHook({
 *   service: "media",
 *   event: "afterCreate",
 *   handler: async ({ context, data }) => {
 *     logger.info({
 *       message: "Media created",
 *       data: { media: data },
 *     });
 *   },
 * });
 * ```
 */
const defineHook = <const Hook extends AllHooks>(hook: Hook): Hook => hook;

export default defineHook;
