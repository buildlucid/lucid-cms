import type { AllHooks } from "./types.js";

/**
 * Defines a lifecycle hook with handler arguments inferred from its service and event.
 * Default export the hook from your hooks directory, or add it to config.hooks.
 * Lower order values execute first; the default is zero.
 * Transform hooks may mutate the data draft or return replacement data.
 * Effect hooks return `{ error: undefined, data: undefined }` on success.
 *
 * @example
 * ```ts
 * const logMedia = defineHook({
 *   service: "media",
 *   event: "afterCreate",
 *   handler: async (_context, { data }) => {
 *     logger.info({
 *       message: "Media created",
 *       data: { media: data },
 *     });
 *     return { error: undefined, data: undefined };
 *   },
 * });
 * ```
 */
const defineHook = <const Hook extends AllHooks>(hook: Hook): Hook => hook;

export default defineHook;
