import { configureLucid, z } from "@lucidcms/core";
import CloudflareKVPlugin from "@lucidcms/plugin-cloudflare-kv";
import PagesPlugin from "@lucidcms/plugin-pages";
import S3Plugin from "@lucidcms/plugin-s3";
import PageCollection from "./src/lucid/collections/pages.js";

export const envSchema = z.object({
	LIBSQL_URL: z.string(),
	LIBSQL_AUTH_TOKEN: z.string().optional(),
	ENCRYPTION_SECRET: z.string(),
	COOKIE_SECRET: z.string(),
	REFRESH_TOKEN_SECRET: z.string(),
	ACCESS_TOKEN_SECRET: z.string(),
	KV_BINDING: z.any(),
	S3_ENDPOINT: z.string(),
	S3_BUCKET: z.string(),
	S3_ACCESS_KEY: z.string(),
	S3_SECRET_KEY: z.string(),
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
			S3Plugin({
				endpoint: env.S3_ENDPOINT,
				bucket: env.S3_BUCKET,
				clientOptions: {
					region: "auto",
					accessKeyId: env.S3_ACCESS_KEY,
					secretAccessKey: env.S3_SECRET_KEY,
				},
			}),
		],
	}),
});
