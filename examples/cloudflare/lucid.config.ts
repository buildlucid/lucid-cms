import { configureLucid, z } from "@lucidcms/core";
import { d1 } from "@lucidcms/db-d1";
import { cloudflareKVPlugin } from "@lucidcms/plugin-cloudflare-kv";
import { cloudflareR2Plugin } from "@lucidcms/plugin-cloudflare-r2";
import { pagesPlugin } from "@lucidcms/plugin-pages";
import { cloudflare } from "@lucidcms/runtime-cloudflare";
import PageCollection from "./src/collections/pages.js";

export default configureLucid({
	runtime: cloudflare({
		wrangler: {
			bindings: {
				d1: true,
				kv: true,
				r2: true
			},
		},
	}),
	db: d1,
	env: z.object({
		ENCRYPTION_SECRET: z.string(),
		COOKIE_SECRET: z.string(),
		REFRESH_TOKEN_SECRET: z.string(),
		ACCESS_TOKEN_SECRET: z.string(),
	}),
	config: (env) => ({
		secrets: {
			encryption: env.ENCRYPTION_SECRET,
			cookie: env.COOKIE_SECRET,
			refreshToken: env.REFRESH_TOKEN_SECRET,
			accessToken: env.ACCESS_TOKEN_SECRET,
		},
		collections: [PageCollection],
		plugins: [
			pagesPlugin({
				collections: [
					{
						collectionKey: PageCollection.key,
						displayFullSlug: false,
					},
				],
			}),
			cloudflareKVPlugin(),
			cloudflareR2Plugin(),
		],
	}),
});
