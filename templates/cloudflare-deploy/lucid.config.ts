import { configureLucid, z } from "@lucidcms/core";
import { d1 } from "@lucidcms/db-d1";
import { cloudflareKVPlugin } from "@lucidcms/plugin-cloudflare-kv";
import { cloudflareR2Plugin } from "@lucidcms/plugin-cloudflare-r2";
import { pagesPlugin } from "@lucidcms/plugin-pages";
import { cloudflare } from "@lucidcms/runtime-cloudflare";
import PageCollection from "./src/collections/pages.js";

export default configureLucid({
	runtime: cloudflare({
		wrangler: "./wrangler.jsonc",
	}),
	db: d1,
	env: z.object({
		LUCID_SECRET: z.string().length(64),
	}),
	config: (env) => ({
		secrets: env.LUCID_SECRET,
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
