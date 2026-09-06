import type { AllHooks } from "./types.js";

/**
 * Defines a lifecycle hook with handler arguments inferred from its service and event.
 * Default export the hook from your hooks directory, or add it to config.hooks.
 * Lower order values execute first; the default is zero.
 */
const defineHook = <const Hook extends AllHooks>(hook: Hook): Hook => hook;

export default defineHook;
