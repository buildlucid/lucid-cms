import isPlainObject from "../../../utils/helpers/is-plain-object.js";
import { hookExecutionKinds } from "../../hooks/hook-map.js";
import type { LucidPluginDefinition } from "../../plugins/types.js";

//* service and event names match the core ones, such as documentWorkflows.afterUpdate
const namePattern = /^[a-z][A-Za-z0-9]*$/;

/** Validates plugin hook event definitions once, when Lucid processes config. */
const checkHookEvents = (plugins: readonly LucidPluginDefinition[]) => {
	const registeredKeys = new Set<string>();

	for (const plugin of plugins) {
		const definition = plugin.hookEvents;
		if (definition === undefined) continue;

		if (
			!isPlainObject(definition) ||
			definition.type !== "hook-events-definition" ||
			!isPlainObject(definition.events)
		) {
			throw new Error(
				`Plugin "${plugin.key}" has invalid hook events. Use defineHookEvents() to create them.`,
			);
		}
		if (
			typeof definition.key !== "string" ||
			!namePattern.test(definition.key)
		) {
			throw new Error(
				`Hook service key "${String(definition.key)}" from plugin "${plugin.key}" must start with a lowercase letter and use only letters and numbers.`,
			);
		}
		if (Object.hasOwn(hookExecutionKinds, definition.key)) {
			throw new Error(
				`Hook service key "${definition.key}" from plugin "${plugin.key}" is reserved by Lucid.`,
			);
		}
		if (registeredKeys.has(definition.key)) {
			throw new Error(
				`Hook service key "${definition.key}" is registered by more than one plugin.`,
			);
		}

		for (const [event, kind] of Object.entries(definition.events)) {
			if (!namePattern.test(event)) {
				throw new Error(
					`Hook event "${definition.key}.${event}" from plugin "${plugin.key}" must start with a lowercase letter and use only letters and numbers.`,
				);
			}
			if (kind !== "effect" && kind !== "transform") {
				throw new Error(
					`Hook event "${definition.key}.${event}" from plugin "${plugin.key}" must be "effect" or "transform".`,
				);
			}
		}

		registeredKeys.add(definition.key);
	}
};

export default checkHookEvents;
