import { configureLucid, z } from "@lucidcms/core";
import { libsql } from "@lucidcms/db-libsql";
import { cloudflareKVPlugin } from "@lucidcms/plugin-cloudflare-kv";
import { cloudflareR2Plugin } from "@lucidcms/plugin-cloudflare-r2";
import { pagesPlugin } from "@lucidcms/plugin-pages";
import { cloudflare } from "@lucidcms/runtime-cloudflare";
import PageCollection from "./src/lucid/collections/pages.js";

export const env = z.object({
	LIBSQL_URL: z.string(),
	LIBSQL_AUTH_TOKEN: z.string().optional(),
	ENCRYPTION_SECRET: z.string(),
	COOKIE_SECRET: z.string(),
	REFRESH_TOKEN_SECRET: z.string(),
	ACCESS_TOKEN_SECRET: z.string(),
	KV_BINDING: z.any(),
	MEDIA_BUCKET: z.any(),
});

export default configureLucid({
	runtime: cloudflare,
	db: libsql,
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
						displayFullSlug: true,
					},
				],
			}),
			cloudflareKVPlugin({
				binding: env.KV_BINDING,
			}),
			cloudflareR2Plugin({
				binding: env.MEDIA_BUCKET,
			}),
		],
	}),
});
