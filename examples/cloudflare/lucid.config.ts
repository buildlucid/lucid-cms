import type { KVNamespace, Queue } from "@cloudflare/workers-types";
import { cloudflareAdapter, defineConfig } from "@lucidcms/cloudflare-adapter";
import { z } from "@lucidcms/core";
import LibSQLAdapter from "@lucidcms/libsql-adapter";
import CloudflareKVPlugin from "@lucidcms/plugin-cloudflare-kv";
import CloudflareQueuesPlugin from "@lucidcms/plugin-cloudflare-queues";
import PagesPlugin from "@lucidcms/plugin-pages";
import ResendPlugin from "@lucidcms/plugin-resend";
import S3Plugin from "@lucidcms/plugin-s3";
import NewsCollection from "./src/collections/news.js";
import PageCollection from "./src/collections/pages.js";
import SettingsCollection from "./src/collections/settings.js";

export const adapter = cloudflareAdapter({
	platformProxy: {
		environment: "dev",
	},
});

export const envSchema = z.object({
	LUCID_TURSO_URL: z.string(),
	LUCID_TURSO_AUTH_TOKEN: z.string(),
	LUCID_ENCRYPTION_SECRET: z.string(),
	LUCID_COOKIE_SECRET: z.string(),
	LUCID_REFRESH_TOKEN_SECRET: z.string(),
	LUCID_ACCESS_TOKEN_SECRET: z.string(),
	LUCID_RESEND_FROM_EMAIL: z.string(),
	LUCID_RESEND_FROM_NAME: z.string(),
	LUCID_RESEND_API_KEY: z.string(),
	LUCID_RESEND_WEBHOOK_SECRET: z.string(),
	LUCID_S3_ENDPOINT: z.string(),
	LUCID_S3_BUCKET: z.string(),
	LUCID_S3_ACCESS_KEY: z.string(),
	LUCID_S3_SECRET_KEY: z.string(),
	LUCID_MEDIA_URL: z.string(),
	LUCID_CLOUDFLARE_KV: z.custom<KVNamespace>(),
	LUCID_CLOUDFLARE_QUEUES: z.custom<Queue>(),
});

export default defineConfig((env) => ({
	db: new LibSQLAdapter({
		url: env.LUCID_TURSO_URL,
		authToken: env.LUCID_TURSO_AUTH_TOKEN,
		// url: "http://127.0.0.1:8081",
	}),
	secrets: {
		encryption: env.LUCID_ENCRYPTION_SECRET,
		cookie: env.LUCID_COOKIE_SECRET,
		refreshToken: env.LUCID_REFRESH_TOKEN_SECRET,
		accessToken: env.LUCID_ACCESS_TOKEN_SECRET,
	},
	email: {
		from: {
			email: env.LUCID_RESEND_FROM_EMAIL,
			name: env.LUCID_RESEND_FROM_NAME,
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
			apiKey: env.LUCID_RESEND_API_KEY,
			webhook: {
				enabled: false,
				secret: env.LUCID_RESEND_WEBHOOK_SECRET,
			},
		}),
		S3Plugin({
			endpoint: env.LUCID_S3_ENDPOINT,
			bucket: env.LUCID_S3_BUCKET,
			clientOptions: {
				region: "auto",
				accessKeyId: env.LUCID_S3_ACCESS_KEY,
				secretAccessKey: env.LUCID_S3_SECRET_KEY,
			},
		}),
		CloudflareKVPlugin({
			binding: env.LUCID_CLOUDFLARE_KV,
		}),
		CloudflareQueuesPlugin({
			binding: env.LUCID_CLOUDFLARE_QUEUES,
		}),
	],
}));
