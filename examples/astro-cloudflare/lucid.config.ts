import { configureLucid, z } from "@lucidcms/core";
import CloudflareKVPlugin from "@lucidcms/plugin-cloudflare-kv";
import CloudflareR2Plugin from "@lucidcms/plugin-cloudflare-r2";
import PagesPlugin from "@lucidcms/plugin-pages";
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
	adapter: {
		module: "@lucidcms/cloudflare-adapter",
	},
	database: {
		module: "@lucidcms/libsql-adapter",
		options: (env) => ({
			url: env.LIBSQL_URL,
			authToken: env.LIBSQL_AUTH_TOKEN,
		}),
	},
	config: (env) => ({
		secrets: {
			encryption: env.ENCRYPTION_SECRET,
			cookie: env.COOKIE_SECRET,
			refreshToken: env.REFRESH_TOKEN_SECRET,
			accessToken: env.ACCESS_TOKEN_SECRET,
		},
		collections: [PageCollection],
		plugins: [
			PagesPlugin({
				collections: [
					{
						collectionKey: PageCollection.key,
						displayFullSlug: true,
					},
				],
			}),
			CloudflareKVPlugin({
				binding: env.KV_BINDING,
			}),
			CloudflareR2Plugin({
				binding: env.MEDIA_BUCKET,
			}),
		],
	}),
});
