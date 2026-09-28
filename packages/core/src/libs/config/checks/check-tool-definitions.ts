import { z } from "zod";
import constants from "../../../constants/constants.js";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import { runnerToolNames } from "../../agent/runner-tools.js";
import { getExternalCapability } from "../../permission/capabilities.js";
import { getValidPermissions } from "../../permission/registry.js";
import { isToolDefinition } from "../../tools/registry.js";
import type { ToolDefinition } from "../../tools/types.js";

/** Checks a tool's name, schemas and access requirements. */
const checkTool = (
	config: ResolvedLucidConfig,
	tool: ToolDefinition,
	permissions: ReadonlySet<string>,
) => {
	if (tool.name.length > 128 || !/^[a-z][a-z0-9._-]*$/.test(tool.name)) {
		throw new Error(`Invalid tool name "${tool.name}".`);
	}
	const descriptions =
		typeof tool.description === "function"
			? [
					tool.description({ mode: "chat" }),
					tool.description({ mode: "routine" }),
				]
			: [tool.description];
	if (
		descriptions.some(
			(description) => typeof description !== "string" || !description.trim(),
		)
	) {
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
		if (
			tool.name.length > 64 ||
			!/^[a-z][a-z0-9_-]*$/.test(tool.name) ||
			descriptions.some((description) => description.length > 2000)
		) {
			throw new Error(
				`Agent tool "${tool.name}" needs a provider-compatible name (up to 64 characters) and description (up to 2000 characters).`,
			);
		}

		if (runnerToolNames.has(tool.name)) {
			throw new Error(`Agent tool name "${tool.name}" is reserved.`);
		}

		if (
			tool.interaction &&
			(!tool.interaction.key ||
				tool.interaction.key.startsWith(
					constants.agent.widgets.reservedPrefix,
				) ||
				!Number.isInteger(tool.interaction.version) ||
				tool.interaction.version < 1)
		) {
			throw new Error(
				`Agent tool "${tool.name}" needs an interaction key that does not start with "${constants.agent.widgets.reservedPrefix}" and a positive whole-number version.`,
			);
		}

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
};

/** Checks that a placement only holds tools for its target, with unique names. */
const checkPlacement = (
	label: string,
	target: ToolDefinition["target"],
	tools: readonly unknown[],
) => {
	const names = new Set<string>();

	for (const tool of tools) {
		if (!isToolDefinition(tool) || tool.target !== target) {
			throw new Error(
				`${label} tools must be created with ${target === "mcp" ? "defineMcpTool" : "defineAgentTool"}.`,
			);
		}

		if (names.has(tool.name)) {
			throw new Error(`${label} registers tool "${tool.name}" more than once.`);
		}

		names.add(tool.name);
	}
};

/** Checks MCP and agent tools at config time. A tool shared by several agents is checked once. */
const checkToolDefinitions = (config: ResolvedLucidConfig) => {
	const permissions = new Set(getValidPermissions(config));
	const checked = new Set<ToolDefinition>();

	const mcpTools = config.ai.mcp.tools;
	checkPlacement("MCP", "mcp", mcpTools);
	for (const tool of mcpTools) checked.add(tool);

	for (const agent of config.ai.agents.definitions) {
		const label = `Agent "${agent.key}"`;
		const tools = agent.tools;
		checkPlacement(label, "agent", tools);

		for (const tool of tools) checked.add(tool);
	}

	for (const tool of checked) checkTool(config, tool, permissions);
};

export default checkToolDefinitions;
