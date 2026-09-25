import type { ResolvedLucidConfig } from "../../types/config.js";
import type { SkillDefinition } from "./types.js";

export const isSkillDefinition = (value: unknown): value is SkillDefinition =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "skill-definition";

const registries = new WeakMap<
	ResolvedLucidConfig,
	ReadonlyMap<string, SkillDefinition>
>();

/** Returns active plugin and project skills in name order. */
export const getSkillRegistry = (
	config: ResolvedLucidConfig,
): ReadonlyMap<string, SkillDefinition> => {
	const existing = registries.get(config);
	if (existing) return existing;

	const disabled = new Set(config.ai.skills.disabled);
	const definitions = config.ai.skills.definitions
		.filter((definition) => !disabled.has(definition.name))
		.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

	const registry = new Map(
		definitions.map((definition) => [definition.name, definition]),
	);
	registries.set(config, registry);

	return registry;
};
