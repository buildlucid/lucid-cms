import type { KVNamespace, Queue } from "@cloudflare/workers-types";
import { defineConfig, z } from "@lucidcms/core";
import LibSQLAdapter from "@lucidcms/libsql-adapter";
import CloudflareKVPlugin from "@lucidcms/plugin-cloudflare-kv";
import CloudflareQueuesPlugin from "@lucidcms/plugin-cloudflare-queues";
import PagesPlugin from "@lucidcms/plugin-pages";
import ResendPlugin from "@lucidcms/plugin-resend";
import S3Plugin from "@lucidcms/plugin-s3";
import NewsCollection from "./src/collections/news.js";
import PageCollection from "./src/collections/pages.js";
import SettingsCollection from "./src/collections/settings.js";

export const envSchema = z.object({
	TURSO_URL: z.string(),
	TURSO_AUTH_TOKEN: z.string(),
	ENCRYPTION_SECRET: z.string(),
	COOKIE_SECRET: z.string(),
	REFRESH_TOKEN_SECRET: z.string(),
	ACCESS_TOKEN_SECRET: z.string(),
	RESEND_FROM_EMAIL: z.string(),
	RESEND_FROM_NAME: z.string(),
	RESEND_API_KEY: z.string(),
	RESEND_WEBHOOK_SECRET: z.string(),
	S3_ENDPOINT: z.string(),
	S3_BUCKET: z.string(),
	S3_ACCESS_KEY: z.string(),
	S3_SECRET_KEY: z.string(),
	CLOUDFLARE_KV: z.custom<KVNamespace>(),
	CLOUDFLARE_QUEUES: z.custom<Queue>(),
});

export default defineConfig({
	adapter: {
		from: "@lucidcms/cloudflare-adapter",
		options: {
			platformProxy: {
				environment: "dev",
			},
		},
	},
	config: (env) => ({
		db: new LibSQLAdapter({
			url: env.TURSO_URL,
			authToken: env.TURSO_AUTH_TOKEN,
			// url: "http://127.0.0.1:8081",
		}),
		secrets: {
			encryption: env.ENCRYPTION_SECRET,
			cookie: env.COOKIE_SECRET,
			refreshToken: env.REFRESH_TOKEN_SECRET,
			accessToken: env.ACCESS_TOKEN_SECRET,
		},
		email: {
			from: {
				email: env.RESEND_FROM_EMAIL,
				name: env.RESEND_FROM_NAME,
			},
			simulate: true,
		},
		collections: [PageCollection, NewsCollection, SettingsCollection],
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
			ResendPlugin({
				apiKey: env.RESEND_API_KEY,
				webhook: {
					enabled: false,
					secret: env.RESEND_WEBHOOK_SECRET,
				},
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
