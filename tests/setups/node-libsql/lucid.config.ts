import { defineConfig } from "@lucidcms/core";
import { libsql } from "@lucidcms/libsql";
import { node } from "@lucidcms/node";
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
	db: libsql((env) => ({ url: getDatabaseUrl(env) })),
	config: (env) => withSchemaStep(env, sharedConfig({ url: env.HARNESS_URL })),
});
