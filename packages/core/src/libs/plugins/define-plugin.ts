import type { LucidPluginDefinition } from "./types.js";

/**
 * Defines a plugin's defaults, resources and lifecycle callbacks.
 * Explicit project settings override plugin defaults. Plugin configure callbacks
 * run afterwards, in registration order; the project configure callback runs last.
 *
 * @example
 * ```ts
 * export default definePlugin({
 *   key: "site-brand",
 *   lucid: "0.x.x",
 *   defaults: {
 *     brand: { name: "Example Studio" },
 *   },
 *   sources: {
 *     templates: [new URL("./templates/", import.meta.url)],
 *   },
 * });
 * ```
 */
const definePlugin = <const Definition extends LucidPluginDefinition>(
	definition: Definition,
): Definition => definition;

export default definePlugin;
