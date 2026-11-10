import { cloudflare } from "@lucidcms/cloudflare";
import { defineConfig, z } from "@lucidcms/core";
import { postgres } from "@lucidcms/postgres";
import { sharedConfig } from "../../shared/config.ts";

/** A Worker reads its database from a Hyperdrive binding, which `cloudflare.config.ts` points at the harness's database. */
export const env = z.object({
	LUCID_DB: z.object({ connectionString: z.string() }),
	HARNESS_URL: z.url().default("http://localhost:6543"),
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
	}),
});
