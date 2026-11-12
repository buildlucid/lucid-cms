import { defineConfig } from "@lucidcms/core";
import { node } from "@lucidcms/node";
import { sqlite } from "@lucidcms/sqlite";
import { harnessEnv } from "#harness/config";
import { getDatabaseUrl } from "../../shared/config/config.ts";
import { nodeHarnessConfig } from "../../shared/config/node-config.ts";

export const env = harnessEnv;

export default defineConfig({
	env,
	runtime: node,
	db: sqlite((env) => ({ database: getDatabaseUrl(env) })),
	config: (env) => nodeHarnessConfig(env),
});
