import { cloudflare } from "@lucidcms/cloudflare";
import { cloudflareImages } from "@lucidcms/cloudflare-images";
import { cloudflareKV } from "@lucidcms/cloudflare-kv";
import { cloudflareR2 } from "@lucidcms/cloudflare-r2";
import { defineConfig, z } from "@lucidcms/core";
import { pages } from "@lucidcms/pages";
import { postgres } from "@lucidcms/postgres";
import PageCollection from "./src/collections/pages.js";

export const env = z.object({
	/** Hyperdrive binding declared in cloudflare.config.ts. */
	LUCID_DB: z.object({ connectionString: z.string() }),
	LUCID_SECRET: z.string().length(64),
	/** The CMS's public address, such as its workers.dev URL or custom domain. */
	LUCID_CMS_URL: z.url(),
});

export default defineConfig({
	runtime: cloudflare,
	db: postgres((env) => ({ url: env.LUCID_DB.connectionString })),
	config: (env) => ({
		url: env.LUCID_CMS_URL,
		secrets: env.LUCID_SECRET,
		collections: [PageCollection],
		plugins: [
			pages({
				collections: [
					{
						key: "page",
					},
				],
			}),
			cloudflareImages(),
			cloudflareKV(),
			cloudflareR2(),
		],
	}),
});
