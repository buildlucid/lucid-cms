import type { LucidConfigDefinition } from "./types.js";

/**
 * Defines the runtime, database and project settings in `lucid.config.*`.
 * Return project settings from the `config(env)` callback. Export a named `env`
 * schema to validate environment variables. Generated types provide typed env
 * properties; parsing the schema also works before those types exist.
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
 *   config: (environment) => ({
 *     secrets: env.parse(environment).SECRET,
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
