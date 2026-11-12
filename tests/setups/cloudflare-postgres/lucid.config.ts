import { cloudflare } from "@lucidcms/cloudflare";
import { cloudflareQueues } from "@lucidcms/cloudflare-queues";
import { cloudflareR2 } from "@lucidcms/cloudflare-r2";
import { defineConfig, z } from "@lucidcms/core";
import { postgres } from "@lucidcms/postgres";
import { harnessEnv } from "#harness/config";
import { harnessConfig } from "../../shared/config/config.ts";
import seedsPlugin from "../../shared/config/seeds/plugin.ts";
import { workingSeeds } from "../../shared/config/seeds/seeds.ts";

/** A Worker reads its database from a Hyperdrive binding, which `cloudflare.config.ts` points at the harness's database. */
export const env = harnessEnv
	.pick({
		HARNESS_URL: true,
		HARNESS_OUTBOX: true,
		HARNESS_LEDGER: true,
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
	config: (env) =>
		harnessConfig(env, {
			//* a Worker can't read schema steps, so seed tests use the seeds registered here, which run inside it
			seeds: workingSeeds,
			sources: { seeds: ["../../shared/config/seeds/files"] },
			plugins: [
				//* a local bucket in development, so media runs on Workers without credentials
				cloudflareR2(),
				//* a local queue in development, delivered by workerd as it would be once deployed
				cloudflareQueues(),
				seedsPlugin(undefined),
			],
		}),
});
