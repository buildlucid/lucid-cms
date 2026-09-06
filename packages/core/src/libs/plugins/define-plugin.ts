import type { LucidPluginDefinition } from "./types.js";

/** Defines a plugin's defaults, contributions and lifecycle callbacks. */
const definePlugin = <const Definition extends LucidPluginDefinition>(
	definition: Definition,
): Definition => definition;

export default definePlugin;
