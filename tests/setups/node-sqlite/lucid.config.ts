import { defineConfig } from "@lucidcms/core";
import { node } from "@lucidcms/node";
import { sqlite } from "@lucidcms/sqlite";
import {
	getDatabaseUrl,
	harnessEnv,
	sharedConfig,
	withSchemaStep,
} from "../../shared/config.ts";

export const env = harnessEnv;

export default defineConfig({
	env,
	runtime: node,
	db: sqlite((env) => ({ database: getDatabaseUrl(env) })),
	config: (env) => withSchemaStep(env, sharedConfig({ url: env.HARNESS_URL })),
});
