import type { z } from "zod";
import type { LucidConfig } from "../../types/config.js";
import type { EnvironmentVariables, LucidConfigDefinition } from "./types.js";

/** `defineConfig`'s input. The `env` schema types the `config` callback without generated types. */
type LucidConfigDefinitionInput<TEnv extends z.ZodType | undefined> = Omit<
	LucidConfigDefinition,
	"env" | "config"
> & {
	/** Validates and parses environment variables before `config` and `db` receive them. */
	env?: TEnv;
	/** Return project settings using the parsed environment. */
	config: (
		env: TEnv extends z.ZodType ? z.output<TEnv> : EnvironmentVariables,
	) => LucidConfig;
};

/**
 * Defines the runtime, database and project settings in `lucid.config.*`.
 * Pass an `env` schema to validate environment variables and type the `config(env)` callback.
 * Also export the schema as `env`, which types `context.env` in hooks, routes and other files.
 *
 * @example
 * ```ts
 * import { defineConfig, z } from "@lucidcms/core";
 * import { node } from "@lucidcms/node";
 * import { sqlite } from "@lucidcms/sqlite";
 *
 * export const env = z.object({
 *   SECRET: z.string().length(64),
 * });
 *
 * export default defineConfig({
 *   runtime: node,
 *   db: sqlite,
 *   env: env,
 *   config: (env) => ({
 *     url: "https://cms.example.com",
 *     secrets: env.SECRET,
 *   }),
 * });
 * ```
 */
const defineConfig = <TEnv extends z.ZodType | undefined = undefined>(
	definition: LucidConfigDefinitionInput<TEnv>,
): LucidConfigDefinition => {
	return {
		...definition,
		//* Lucid parses the environment with `env` before calling `config`, which the stored definition's wider type can't express
		config: (env) =>
			definition.config(env as Parameters<typeof definition.config>[0]),
	};
};

export default defineConfig;
