import { defineConfig, z } from "@lucidcms/core";
import { d1 } from "@lucidcms/db-d1";
import { cloudflareImagesPlugin } from "@lucidcms/plugin-cloudflare-images";
import { cloudflareKVPlugin } from "@lucidcms/plugin-cloudflare-kv";
import { cloudflareR2Plugin } from "@lucidcms/plugin-cloudflare-r2";
import { pagesPlugin } from "@lucidcms/plugin-pages";
import { cloudflare } from "@lucidcms/runtime-cloudflare";

export const env = z.object({
	LUCID_SECRET: z.string().length(64),
});

export default defineConfig({
	runtime: cloudflare({
		wrangler: "./wrangler.jsonc",
	}),
	db: d1,
	config: (env) => ({
		secrets: env.LUCID_SECRET,
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
