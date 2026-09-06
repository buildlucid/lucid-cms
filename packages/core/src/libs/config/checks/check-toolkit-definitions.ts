import isPlainObject from "../../../utils/helpers/is-plain-object.js";
import type { LucidPluginDefinition } from "../../plugins/types.js";
import type { CoreToolkit } from "../../toolkit/types.js";

const coreToolkitKeys = {
	auth: true,
	documents: true,
	email: true,
	jobs: true,
	locales: true,
	media: true,
	previews: true,
} satisfies Record<keyof CoreToolkit, true>;
const unsafeToolkitKeys = new Set(["__proto__", "constructor", "prototype"]);
const toolkitKeyPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** Validates plugin toolkit definitions once, when Lucid processes config. */
const checkToolkitDefinitions = (plugins: readonly LucidPluginDefinition[]) => {
	const registeredKeys = new Set<string>();

	for (const plugin of plugins) {
		const definition = plugin.toolkit;
		if (definition === undefined) continue;

		if (
			!isPlainObject(definition) ||
			definition.type !== "toolkit-definition" ||
			typeof definition.create !== "function"
		) {
			throw new Error(
				`Plugin "${plugin.key}" has an invalid toolkit definition. Use defineToolkit() to create it.`,
			);
		}
		if (
			typeof definition.key !== "string" ||
			!toolkitKeyPattern.test(definition.key) ||
			unsafeToolkitKeys.has(definition.key)
		) {
			throw new Error(
				`Toolkit service key "${String(definition.key)}" from plugin "${plugin.key}" must be a safe JavaScript property name.`,
			);
		}
		if (Object.hasOwn(coreToolkitKeys, definition.key)) {
			throw new Error(
				`Toolkit service key "${definition.key}" from plugin "${plugin.key}" is reserved by Lucid.`,
			);
		}
		if (registeredKeys.has(definition.key)) {
			throw new Error(
				`Toolkit service key "${definition.key}" is registered by more than one plugin.`,
			);
		}

		registeredKeys.add(definition.key);
	}
};

export default checkToolkitDefinitions;
