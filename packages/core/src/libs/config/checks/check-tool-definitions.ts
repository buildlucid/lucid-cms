import { z } from "zod";
import constants from "../../../constants/constants.js";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import {
	builtInToolNames,
	getRunnerTools,
} from "../../agent/built-in-tools.js";
import { getExternalCapability } from "../../permission/capabilities.js";
import { getValidPermissions } from "../../permission/registry.js";
import { getCoreAgentTools, getCoreMcpTools } from "../../tools/core-tools.js";
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
		if (
			tool.name.length > 64 ||
			!/^[a-z][a-z0-9_-]*$/.test(tool.name) ||
			tool.description.length > 2000
		) {
			throw new Error(
				`Agent tool "${tool.name}" needs a provider-compatible name (up to 64 characters) and description (up to 2000 characters).`,
			);
		}

		if (builtInToolNames.has(tool.name)) {
			throw new Error(`Agent tool name "${tool.name}" is reserved.`);
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
				`${label} tools must be created with defineTool and target "${target}".`,
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

	const mcpTools = [...getCoreMcpTools(), ...config.ai.mcp.tools];
	checkPlacement("MCP", "mcp", mcpTools);
	for (const tool of mcpTools) checked.add(tool);

	for (const agent of config.ai.agents) {
		const label = `Agent "${agent.key}"`;
		const coreAgentTools = getCoreAgentTools();
		const tools = [...coreAgentTools, ...agent.tools];
		checkPlacement(label, "agent", tools);

		const runnerTools = getRunnerTools({
			mode: "routine",
			canAsk: true,
			hasHistory: true,
			hasSkills: agent.skills.length > 0,
		});
		const maxTools =
			constants.agent.limits.maxTools -
			runnerTools.length -
			coreAgentTools.length;

		if (agent.tools.length > maxTools) {
			throw new Error(
				`${label} can have at most ${maxTools} additional tools (${coreAgentTools.length} content tools and ${runnerTools.length} runner tools also count toward the ${constants.agent.limits.maxTools}-tool limit).`,
			);
		}

		for (const tool of tools) checked.add(tool);
	}

	for (const tool of checked) checkTool(config, tool, permissions);
};

export default checkToolDefinitions;
