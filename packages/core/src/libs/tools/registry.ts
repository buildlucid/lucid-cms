import type { ResolvedLucidConfig } from "../../types/config.js";
import type { ToolDefinition } from "./types.js";

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
	ReadonlyMap<string, ToolDefinition>
>();

/** Returns active core, plugin and project tools in name order. */
export const getToolRegistry = (
	config: ResolvedLucidConfig,
): ReadonlyMap<string, ToolDefinition> => {
	const existing = registries.get(config);
	if (existing) return existing;

	const disabled = new Set(config.ai.tools.disabled);
	const definitions = config.ai.tools.definitions
		.filter((definition) => !disabled.has(definition.name))
		.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

	const registry = new Map(
		definitions.map((definition) => [definition.name, definition]),
	);
	registries.set(config, registry);

	return registry;
};
