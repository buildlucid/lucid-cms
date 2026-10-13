import constants from "../../constants/constants.js";
import type { ResolvedLucidConfig } from "../../types/config.js";
import { toolDefinitionInternal } from "./tool-definition-internal.js";
import type { McpToolDefinition, ToolDefinition } from "./types.js";

/** The reserved widgets each core tool may show, by tool name. */
export const coreToolWidgets: ReadonlyMap<string, readonly string[]> = new Map(
	Object.entries(constants.agent.widgets.tools),
);

export const isToolDefinition = (value: unknown): value is ToolDefinition =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "tool-definition" &&
	toolDefinitionInternal in value;

const registries = new WeakMap<
	ResolvedLucidConfig,
	ReadonlyMap<string, McpToolDefinition>
>();

/** Returns the MCP tools, in name order. */
export const getMcpToolRegistry = (
	config: ResolvedLucidConfig,
): ReadonlyMap<string, McpToolDefinition> => {
	const existing = registries.get(config);
	if (existing) return existing;

	const registry = new Map(
		config.ai.mcp.tools
			.toSorted((a, b) => a.name.localeCompare(b.name))
			.map((definition) => [definition.name, definition]),
	);
	registries.set(config, registry);

	return registry;
};
