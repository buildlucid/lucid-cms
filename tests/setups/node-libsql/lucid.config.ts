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
import { authentication } from "../../shared/fragments/auth.ts";
import { mediaConfig } from "../../shared/fragments/media.ts";
import { nodeMediaPlugins } from "../../shared/fragments/node-media.ts";
import { outbox } from "../../shared/fragments/outbox.ts";

export const env = harnessEnv;

export default defineConfig({
	env,
	runtime: node,
	db: libsql((env) => ({ url: getDatabaseUrl(env) })),
	config: (env) =>
		withSchemaStep(env, {
			...sharedConfig({ url: env.HARNESS_URL }),
			...authentication(env),
			...mediaConfig(env),
			email: outbox(env.HARNESS_OUTBOX),
			plugins: [
				...nodeMediaPlugins(env.HARNESS_UPLOADS),
				//* every test database keeps its own keys in the one KV file, so no cached response is shared
				sqliteKV({ namespace: env.HARNESS_DATABASE_URL }),
			],
		}),
});
