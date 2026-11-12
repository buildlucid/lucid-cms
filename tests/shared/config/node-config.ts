import type { LucidConfig } from "@lucidcms/core/types";
import type { HarnessEnv } from "#harness/config";
import { type HarnessConfigOptions, harnessConfig } from "./config.ts";
import { nodeMediaPlugins } from "./fragments/node-media.ts";
import {
	generatedCollection,
	isGeneratedStep,
} from "./migrations/collections/generated.ts";
import steps, {
	type SchemaStep,
	type SchemaStepKey,
} from "./migrations/steps.ts";

/**
 * Applies `HARNESS_SCHEMA_STEP` and `HARNESS_SEEDS` for migration and seed tests. Leaves config
 * unchanged when neither is set.
 */
const withSchemaStep = (env: HarnessEnv, config: LucidConfig): LucidConfig => {
	const seeded: LucidConfig = env.HARNESS_SEEDS
		? {
				...config,
				directories: { ...config.directories, seeds: env.HARNESS_SEEDS },
			}
		: config;
	const key = env.HARNESS_SCHEMA_STEP;
	if (!key) {
		return seeded;
	}
	if (!isGeneratedStep(key) && !Object.hasOwn(steps, key)) {
		throw new Error(`No schema step is registered as "${key}".`);
	}

	const step: SchemaStep = isGeneratedStep(key)
		? { collections: [generatedCollection(key)] }
		: steps[key as SchemaStepKey];
	return {
		...seeded,
		collections: [...(config.collections ?? []), ...(step.collections ?? [])],
		migrations: [...(config.migrations ?? []), ...(step.migrations ?? [])],
		plugins: [...(config.plugins ?? []), ...(step.plugins ?? [])],
		seeds: [...(config.seeds ?? []), ...(step.seeds ?? [])],
		sources: {
			...config.sources,
			migrations: [
				...(config.sources?.migrations ?? []),
				...(step.sources?.migrations ?? []),
			],
			seeds: [...(config.sources?.seeds ?? []), ...(step.sources?.seeds ?? [])],
		},
	};
};

/**
 * `harnessConfig` for Node setups. It also stores uploads in `HARNESS_UPLOADS` and processes
 * images with Sharp, unless the setup goes without `media`, and applies the schema step and seeds
 * folder migration and seed tests load the config with.
 *
 * @example
 * ```ts
 * config: (env) => nodeHarnessConfig(env, { without: ["ai"] }),
 * ```
 */
export const nodeHarnessConfig = (
	env: HarnessEnv,
	options: HarnessConfigOptions = {},
): LucidConfig =>
	withSchemaStep(
		env,
		harnessConfig(env, {
			...options,
			plugins: [
				...(options.without?.includes("media")
					? []
					: nodeMediaPlugins(env.HARNESS_UPLOADS)),
				...(options.plugins ?? []),
			],
		}),
	);
