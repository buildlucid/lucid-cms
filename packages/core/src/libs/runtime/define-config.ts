import type { LucidConfigDefinition } from "./types.js";

/**
 * Wraps your Lucid CMS config and gives it the right shape for `lucid.config.*`.
 * Use it to pass the runtime/database adapters and return the rest of your
 * config from the `config(env)` callback. Optionally export a named `env`
 * schema to validate and type environment variables.
 *
 * @example
 * ```ts
 * import { defineConfig, z } from "@lucidcms/core";
 * import { node } from "@lucidcms/runtime-node";
 * import { sqlite } from "@lucidcms/db-sqlite";
 *
 * export const env = z.object({
 *   SECRET: z.string().length(64),
 * });
 *
 * export default defineConfig({
 *   runtime: node,
 *   db: sqlite,
 *   config: (env) => ({
 *     secrets: env.SECRET,
 *     collections: [],
 *     plugins: [],
 *   }),
 * });
 * ```
 */
const defineConfig = (
	definition: LucidConfigDefinition,
): LucidConfigDefinition => {
	return definition;
};

export default defineConfig;
