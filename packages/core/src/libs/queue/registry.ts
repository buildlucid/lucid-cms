import type { Config } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import type { AnyJobDefinition } from "./types.js";

const registries = new WeakMap<Config, ReadonlyMap<string, AnyJobDefinition>>();

/** Builds the persisted name and version key for a job definition. */
export const getJobDefinitionKey = (definition: {
	name: string;
	version: number;
}) => `${definition.name}@${definition.version}`;

const createJobRegistry = (
	config: Config,
): ReadonlyMap<string, AnyJobDefinition> => {
	const registry = new Map<string, AnyJobDefinition>();
	for (const definition of config.queue.jobs) {
		const key = getJobDefinitionKey(definition);
		if (registry.has(key)) {
			throw new LucidError({
				message: `Job definition "${key}" is registered more than once.`,
			});
		}
		registry.set(key, definition);
	}
	return registry;
};

/** Returns the registered core, project and plugin job definitions. */
export const getJobRegistry = (
	config: Config,
): ReadonlyMap<string, AnyJobDefinition> => {
	const existing = registries.get(config);
	if (existing) return existing;

	const registry = createJobRegistry(config);
	registries.set(config, registry);
	return registry;
};
