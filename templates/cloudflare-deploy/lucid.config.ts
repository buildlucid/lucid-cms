import { defineConfig, z } from "@lucidcms/core";
import { postgres } from "@lucidcms/db-postgres";
import { cloudflareImagesPlugin } from "@lucidcms/plugin-cloudflare-images";
import { cloudflareKVPlugin } from "@lucidcms/plugin-cloudflare-kv";
import { cloudflareR2Plugin } from "@lucidcms/plugin-cloudflare-r2";
import { pagesPlugin } from "@lucidcms/plugin-pages";
import { cloudflare } from "@lucidcms/runtime-cloudflare";
import PageCollection from "./src/collections/pages.js";

export const env = z.object({
	/** Hyperdrive binding declared in cloudflare.config.ts. */
	LUCID_DB: z.object({ connectionString: z.string() }),
	LUCID_SECRET: z.string().length(64),
});

export default defineConfig({
	runtime: cloudflare,
	db: postgres((env) => ({ url: env.LUCID_DB.connectionString })),
	config: (env) => ({
		secrets: env.LUCID_SECRET,
		collections: [PageCollection],
		plugins: [
			pagesPlugin({
				collections: [
					{
						key: "page",
					},
				],
			}),
			cloudflareImagesPlugin(),
			cloudflareKVPlugin(),
			cloudflareR2Plugin(),
		],
	}),
});
