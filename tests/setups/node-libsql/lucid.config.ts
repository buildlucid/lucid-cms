import { defineConfig } from "@lucidcms/core";
import { libsql } from "@lucidcms/libsql";
import { node } from "@lucidcms/node";
import { sqliteKV } from "@lucidcms/sqlite-kv";
import { harnessEnv } from "#harness/config";
import { getDatabaseUrl } from "../../shared/config/config.ts";
import { nodeHarnessConfig } from "../../shared/config/node-config.ts";

export const env = harnessEnv;

export default defineConfig({
	env,
	runtime: node,
	db: libsql((env) => ({ url: getDatabaseUrl(env) })),
	config: (env) =>
		nodeHarnessConfig(env, {
			plugins: [
				//* every test database keeps its own keys in the one KV file, so no cached response is shared
				sqliteKV({ namespace: env.HARNESS_DATABASE_URL }),
			],
		}),
});
