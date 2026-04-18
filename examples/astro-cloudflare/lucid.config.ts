import type { KVNamespace, Queue } from "@cloudflare/workers-types";
import { configureLucid, z } from "@lucidcms/core";
import LibSQLAdapter from "@lucidcms/libsql-adapter";
import CloudflareKVPlugin from "@lucidcms/plugin-cloudflare-kv";
import CloudflareQueuesPlugin from "@lucidcms/plugin-cloudflare-queues";
import PagesPlugin from "@lucidcms/plugin-pages";
import S3Plugin from "@lucidcms/plugin-s3";
import PageCollection from "./src/lucid/collections/pages.js";

export const envSchema = z.object({
	ENCRYPTION_SECRET: z.string(),
	COOKIE_SECRET: z.string(),
	REFRESH_TOKEN_SECRET: z.string(),
	ACCESS_TOKEN_SECRET: z.string(),
	S3_ENDPOINT: z.string(),
	S3_BUCKET: z.string(),
	S3_ACCESS_KEY: z.string(),
	S3_SECRET_KEY: z.string(),
	CLOUDFLARE_KV: z.custom<KVNamespace>(),
	CLOUDFLARE_QUEUES: z.custom<Queue>(),
});

export default configureLucid({
	adapter: {
		from: "@lucidcms/cloudflare-adapter",
	},
	config: (env) => ({
		baseUrl: "http://localhost:4321",
		db: new LibSQLAdapter({
			url: "http://127.0.0.1:8081",
		}),
		secrets: {
			encryption: env.ENCRYPTION_SECRET,
			cookie: env.COOKIE_SECRET,
			refreshToken: env.REFRESH_TOKEN_SECRET,
			accessToken: env.ACCESS_TOKEN_SECRET,
		},
		email: {
			from: {
				email: "no-reply@example.com",
				name: "Lucid CMS",
			},
			simulate: true,
		},
		collections: [PageCollection],
		plugins: [
			PagesPlugin({
				collections: [
					{
						collectionKey: "page",
						useTranslations: true,
						displayFullSlug: false,
					},
				],
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
			CloudflareKVPlugin({
				binding: env.CLOUDFLARE_KV,
			}),
			CloudflareQueuesPlugin({
				binding: env.CLOUDFLARE_QUEUES,
			}),
		],
	}),
});
