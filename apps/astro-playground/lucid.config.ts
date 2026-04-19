import { configureLucid, z } from "@lucidcms/core";
import LibSQLAdapter from "@lucidcms/libsql-adapter";
import CloudflareKVPlugin from "@lucidcms/plugin-cloudflare-kv";
import CloudflareQueuesPlugin from "@lucidcms/plugin-cloudflare-queues";
import PagesPlugin from "@lucidcms/plugin-pages";
import ResendPlugin from "@lucidcms/plugin-resend";
import S3Plugin from "@lucidcms/plugin-s3";
import BlogCollection from "./src/lucid/collections/blogs.js";
import MainMenuCollection from "./src/lucid/collections/main-menu.js";
import PageCollection from "./src/lucid/collections/pages.js";
import SettingsCollection from "./src/lucid/collections/settings.js";
import SimpleCollection from "./src/lucid/collections/simple.js";
import TestCollection from "./src/lucid/collections/test.js";

export const envSchema = z.object({
	LIBSQL_URL: z.string(),
	LIBSQL_AUTH_TOKEN: z.string().optional(),
	LUCID_ENCRYPTION_SECRET: z.string(),
	LUCID_COOKIE_SECRET: z.string(),
	LUCID_REFRESH_TOKEN_SECRET: z.string(),
	LUCID_ACCESS_TOKEN_SECRET: z.string(),
	LUCID_RESEND_API_KEY: z.string(),
	LUCID_RESEND_WEBHOOK_SECRET: z.string(),
	LUCID_R2_ENDPOINT: z.string(),
	LUCID_R2_BUCKET: z.string(),
	LUCID_R2_ACCESS_KEY: z.string(),
	LUCID_R2_SECRET_KEY: z.string(),
	LUCID_KV: z.any(),
	LUCID_QUEUE: z.any(),
});

export default configureLucid({
	adapter: {
		from: "@lucidcms/cloudflare-adapter",
	},
	config: (env) => ({
		brand: {
			name: "Playground",
		},
		db: new LibSQLAdapter({
			url: env.LIBSQL_URL,
			authToken: env.LIBSQL_AUTH_TOKEN,
		}),
		logger: {
			level: "silent",
		},
		auth: {
			password: {
				enabled: true,
			},
		},
		openAPI: {
			enabled: true,
		},
		localization: {
			locales: [
				{
					label: "English",
					code: "en",
				},
				{
					label: "French",
					code: "fr",
				},
			],
			defaultLocale: "en",
		},
		media: {
			limits: {
				fileSize: 200 * 1024 * 1024,
				processedImages: 10,
			},
			images: {
				storeProcessed: true,
				onDemandFormats: true,
			},
			fallback: {
				image: "https://placehold.co/600x400",
				video: "https://cdn.pixabay.com/video/2026/01/05/326081_large.mp4",
			},
		},
		secrets: {
			encryption: env.LUCID_ENCRYPTION_SECRET,
			cookie: env.LUCID_COOKIE_SECRET,
			refreshToken: env.LUCID_REFRESH_TOKEN_SECRET,
			accessToken: env.LUCID_ACCESS_TOKEN_SECRET,
		},
		collections: [
			PageCollection,
			BlogCollection,
			MainMenuCollection,
			SettingsCollection,
			TestCollection,
			SimpleCollection,
		],
		plugins: [
			PagesPlugin({
				collections: [
					{
						collectionKey: PageCollection.key,
						useTranslations: true,
						displayFullSlug: true,
						prefix: {
							en: "en",
							fr: "fr",
						},
					},
					{
						collectionKey: TestCollection.key,
						useTranslations: true,
						displayFullSlug: true,
					},
				],
			}),
			CloudflareKVPlugin({
				binding: env.LUCID_KV,
			}),
			CloudflareQueuesPlugin({
				binding: env.LUCID_QUEUE,
			}),
			ResendPlugin({
				apiKey: env.LUCID_RESEND_API_KEY,
				webhook: {
					enabled: true,
					secret: env.LUCID_RESEND_WEBHOOK_SECRET,
				},
			}),
			S3Plugin({
				endpoint: env.LUCID_R2_ENDPOINT,
				bucket: env.LUCID_R2_BUCKET,
				clientOptions: {
					region: "auto",
					accessKeyId: env.LUCID_R2_ACCESS_KEY,
					secretAccessKey: env.LUCID_R2_SECRET_KEY,
				},
			}),
		],
	}),
});
