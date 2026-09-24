import { z } from "zod";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import { getExternalCapability } from "../../permission/capabilities.js";

/** Checks tool names, schemas, scopes and operator disable entries at config time. */
const checkToolDefinitions = (config: ResolvedLucidConfig) => {
	const names = new Set<string>();
	for (const tool of config.tools.definitions) {
		if (tool.name.length > 128 || !/^[a-z][a-z0-9._-]*$/.test(tool.name)) {
			throw new Error(`Invalid tool name "${tool.name}".`);
		}

		if (names.has(tool.name)) {
			throw new Error(`Tool "${tool.name}" is registered more than once.`);
		}

		names.add(tool.name);
		if (!tool.description.trim()) {
			throw new Error(`Tool "${tool.name}" needs a description.`);
		}

		for (const scope of tool.scopes) {
			if (!getExternalCapability(config, scope)) {
				throw new Error(`Tool "${tool.name}" uses unknown scope "${scope}".`);
			}
		}

		try {
			z.toJSONSchema(tool.input, { io: "input" });
			z.toJSONSchema(tool.output, { io: "output" });
		} catch (error) {
			throw new Error(`Tool "${tool.name}" has an unsupported schema.`, {
				cause: error,
			});
		}
	}

	const disabled = new Set<string>();
	for (const name of config.tools.disabled) {
		if (disabled.has(name)) {
			throw new Error(`Tool "${name}" is disabled more than once.`);
		}

		disabled.add(name);

		if (!names.has(name)) {
			throw new Error(`Disabled tool "${name}" is not registered.`);
		}
	}
};

export default checkToolDefinitions;
