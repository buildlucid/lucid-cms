import type { ResolvedLucidConfig } from "../../types/config.js";
import type {
	AgentToolDefinition,
	McpToolDefinition,
	ToolDefinition,
} from "./types.js";

export const toolDefinitionInternal = Symbol(
	"@lucidcms/core/tool-definition-internal",
);

export const isToolDefinition = (value: unknown): value is ToolDefinition =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "tool-definition" &&
	toolDefinitionInternal in value;

const registries = new WeakMap<
	ResolvedLucidConfig,
	{
		agent: ReadonlyMap<string, AgentToolDefinition>;
		mcp: ReadonlyMap<string, McpToolDefinition>;
	}
>();

export function getToolRegistry(
	config: ResolvedLucidConfig,
	target: "agent",
): ReadonlyMap<string, AgentToolDefinition>;
export function getToolRegistry(
	config: ResolvedLucidConfig,
	target: "mcp",
): ReadonlyMap<string, McpToolDefinition>;
/** Returns active definitions for one target, in name order. */
export function getToolRegistry(
	config: ResolvedLucidConfig,
	target: "agent" | "mcp",
) {
	const existing = registries.get(config);
	if (existing) return existing[target];

	const disabled = new Set(config.ai.tools.disabled);
	const definitions = config.ai.tools.definitions
		.filter((definition) => !disabled.has(definition.name))
		.sort((a, b) => a.name.localeCompare(b.name));
	const registry = {
		agent: new Map(
			definitions
				.filter((definition) => definition.target === "agent")
				.map((definition) => [definition.name, definition]),
		),
		mcp: new Map(
			definitions
				.filter((definition) => definition.target === "mcp")
				.map((definition) => [definition.name, definition]),
		),
	};
	registries.set(config, registry);

	return registry[target];
}
