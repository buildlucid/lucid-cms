import { defineConfig } from "@lucidcms/core";
import { libsql } from "@lucidcms/libsql";
import { node } from "@lucidcms/node";
import {
	getDatabaseUrl,
	harnessEnv,
	sharedConfig,
} from "../../shared/config.ts";

export const env = harnessEnv;

export default defineConfig({
	env,
	runtime: node,
	db: libsql((env) => ({ url: getDatabaseUrl(env) })),
	config: (env) => ({
		...sharedConfig({ url: env.HARNESS_URL }),
	}),
});
