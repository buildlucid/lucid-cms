import { produce } from "immer";
import type { EnvironmentSchema, LucidConfigDefinition } from "./types.js";

type LucidConfigDefinitionWithEnv<TEnvSchema extends EnvironmentSchema> =
	LucidConfigDefinition<TEnvSchema> & {
		env: TEnvSchema;
	};

/**
 * Wraps your Lucid CMS config and gives it the right shape for `lucid.config.*`.
 * Use it to pass the runtime/database adapters and return the rest of your
 * config from the `config(env)` callback.
 *
 * @example
 * ```ts
 * import { configureLucid, z } from "@lucidcms/core";
 * import { node } from "@lucidcms/runtime-node";
 * import { sqlite } from "@lucidcms/db-sqlite";
 *
 * export default configureLucid({
 *   runtime: node,
 *   db: sqlite,
 *   env: z.object({
 *     SECRET: z.string(),
 *   }),
 *   config: (env) => ({
 *     secrets: {
 *       encryption: env.SECRET,
 *       cookie: env.SECRET,
 *       refreshToken: env.SECRET,
 *       accessToken: env.SECRET,
 *     },
 *     collections: [],
 *     plugins: [],
 *   }),
 * });
 * ```
 */
function configureLucid<TEnvSchema extends EnvironmentSchema>(
	definition: LucidConfigDefinitionWithEnv<TEnvSchema>,
): LucidConfigDefinitionWithEnv<TEnvSchema>;
function configureLucid(
	definition: LucidConfigDefinition<undefined>,
): LucidConfigDefinition<undefined>;
function configureLucid(
	definition: LucidConfigDefinition,
): LucidConfigDefinition {
	return produce(definition, () => {});
}

export default configureLucid;
