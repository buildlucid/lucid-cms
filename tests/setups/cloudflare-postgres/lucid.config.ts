import { cloudflare } from "@lucidcms/cloudflare";
import { defineConfig, z } from "@lucidcms/core";
import { postgres } from "@lucidcms/postgres";
import { harnessEnv, sharedConfig } from "../../shared/config.ts";
import { authentication } from "../../shared/fragments/auth.ts";
import { outbox } from "../../shared/fragments/outbox.ts";

/** A Worker reads its database from a Hyperdrive binding, which `cloudflare.config.ts` points at the harness's database. */
export const env = harnessEnv
	.pick({
		HARNESS_URL: true,
		HARNESS_OUTBOX: true,
		HARNESS_IDP_URL: true,
		LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE: true,
	})
	.extend({
		LUCID_DB: z.object({ connectionString: z.string() }),
		HARNESS_PORT: z.coerce.number().default(6543),
	});

export default defineConfig({
	env,
	runtime: cloudflare((env) => ({
		dev: { port: Number(env.HARNESS_PORT ?? 6543), hostname: "127.0.0.1" },
	})),
	db: postgres((values) => ({
		url: env.parse(values).LUCID_DB.connectionString,
	})),
	config: (env) => ({
		...sharedConfig({ url: env.HARNESS_URL }),
		...authentication(env),
		email: outbox(env.HARNESS_OUTBOX),
	}),
});
