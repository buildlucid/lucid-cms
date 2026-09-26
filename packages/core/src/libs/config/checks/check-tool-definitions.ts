import { z } from "zod";
import constants from "../../../constants/constants.js";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import {
	builtInToolNames,
	getRunnerTools,
} from "../../agent/built-in-tools.js";
import { getExternalCapability } from "../../permission/capabilities.js";
import { getValidPermissions } from "../../permission/registry.js";

/** Checks tool names, schemas, access requirements and operator disable entries at config time. */
const checkToolDefinitions = (config: ResolvedLucidConfig) => {
	const names = new Set<string>();
	const registrations = new Set<string>();
	const permissions = new Set(getValidPermissions(config));
	const activeAgentTools = config.ai.tools.definitions.filter(
		(tool) =>
			tool.target === "agent" && !config.ai.tools.disabled.includes(tool.name),
	);

	const runnerTools = getRunnerTools({
		mode: "routine",
		hasHistory: true,
		hasSkills: config.ai.skills.definitions.some(
			(skill) =>
				skill.targets.includes("agent") &&
				!config.ai.skills.disabled.includes(skill.name),
		),
	});
	const maxCustomTools = constants.agent.limits.maxTools - runnerTools.length;

	if (activeAgentTools.length > maxCustomTools) {
		throw new Error(
			`At most ${maxCustomTools} custom agent tools can be enabled at once (${runnerTools.length} runner tools also count toward the ${constants.agent.limits.maxTools}-tool limit).`,
		);
	}

	for (const tool of config.ai.tools.definitions) {
		if (tool.target !== "mcp" && tool.target !== "agent") {
			throw new Error('Tools must target "agent" or "mcp".');
		}
		if (tool.name.length > 128 || !/^[a-z][a-z0-9._-]*$/.test(tool.name)) {
			throw new Error(`Invalid tool name "${tool.name}".`);
		}

		if (
			tool.target === "agent" &&
			(tool.name.length > 64 ||
				!/^[a-z][a-z0-9_-]*$/.test(tool.name) ||
				tool.description.length > 2000)
		) {
			throw new Error(
				`Agent tool "${tool.name}" needs a provider-compatible name (up to 64 characters) and description (up to 2000 characters).`,
			);
		}
		if (tool.target === "agent" && builtInToolNames.has(tool.name)) {
			throw new Error(`Agent tool name "${tool.name}" is reserved.`);
		}
		if (registrations.has(`${tool.target}:${tool.name}`)) {
			throw new Error(`Tool "${tool.name}" is registered more than once.`);
		}

		names.add(tool.name);
		registrations.add(`${tool.target}:${tool.name}`);

		if (!tool.description.trim()) {
			throw new Error(`Tool "${tool.name}" needs a description.`);
		}

		if (tool.target === "mcp") {
			for (const scope of [
				...tool.scopes,
				...(tool.advertisedScopes?.(config) ?? []),
			]) {
				if (!getExternalCapability(config, scope)) {
					throw new Error(`Tool "${tool.name}" uses unknown scope "${scope}".`);
				}
			}
		} else {
			for (const permission of tool.permissions) {
				if (!permissions.has(permission)) {
					throw new Error(
						`Tool "${tool.name}" uses unknown permission "${permission}".`,
					);
				}
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

	for (const name of config.ai.tools.disabled) {
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
