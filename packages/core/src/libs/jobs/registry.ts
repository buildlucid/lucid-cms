import type { ResolvedLucidConfig } from "../../types/config.js";
import type { AnyJobDefinition } from "./types.js";

/** Marks a job definition and keeps its runtime handlers out of public fields. */
export const jobDefinitionInternal = Symbol(
	"@lucidcms/core/job-definition-internal",
);

const registries = new WeakMap<
	ResolvedLucidConfig,
	ReadonlyMap<string, AnyJobDefinition>
>();

/** Checks whether a config value was created with `defineJob`. */
export const isJobDefinition = (value: unknown): value is AnyJobDefinition =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "job-definition" &&
	jobDefinitionInternal in value;

/** Returns the internal handlers attached to a job definition. */
export const getJobDefinitionRuntime = (definition: AnyJobDefinition) =>
	definition[jobDefinitionInternal].runtime;

/** Builds the persisted name and version key for a job definition. */
export const getJobDefinitionKey = (definition: {
	name: string;
	version: number;
}) => `${definition.name}@${definition.version}`;

/** Returns the registered core, project and plugin job definitions. */
export const getJobRegistry = (
	config: ResolvedLucidConfig,
): ReadonlyMap<string, AnyJobDefinition> => {
	const existing = registries.get(config);
	if (existing) return existing;

	const registry = new Map(
		config.jobs.definitions.map((definition) => [
			getJobDefinitionKey(definition),
			definition,
		]),
	);
	registries.set(config, registry);
	return registry;
};

/** Finds the definition registered for a stored job's name and version. */
export const getRegisteredJob = (
	config: ResolvedLucidConfig,
	job: { name: string; version: number },
) => getJobRegistry(config).get(getJobDefinitionKey(job));
