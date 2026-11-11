import { defineConfig } from "@lucidcms/core";
import { libsql } from "@lucidcms/libsql";
import { node } from "@lucidcms/node";
import { sqliteKV } from "@lucidcms/sqlite-kv";
import {
	getDatabaseUrl,
	harnessEnv,
	sharedConfig,
	withSchemaStep,
} from "../../shared/config.ts";
import { media } from "../../shared/fragments/media.ts";
import { outbox } from "../../shared/fragments/outbox.ts";

export const env = harnessEnv;

export default defineConfig({
	env,
	runtime: node,
	db: libsql((env) => ({ url: getDatabaseUrl(env) })),
	config: (env) =>
		withSchemaStep(env, {
			...sharedConfig({ url: env.HARNESS_URL }),
			email: outbox(env.HARNESS_OUTBOX),
			plugins: [
				media(env.HARNESS_UPLOADS),
				//* every test database keeps its own keys in the one KV file, so no cached response is shared
				sqliteKV({ namespace: env.HARNESS_DATABASE_URL }),
			],
		}),
});
