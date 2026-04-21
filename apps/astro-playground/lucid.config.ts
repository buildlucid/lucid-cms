import { configureLucid, z } from "@lucidcms/core";
import CloudflareKVPlugin from "@lucidcms/plugin-cloudflare-kv";
import CloudflareQueuesPlugin from "@lucidcms/plugin-cloudflare-queues";
import CloudflareR2Plugin from "@lucidcms/plugin-cloudflare-r2";
import PagesPlugin from "@lucidcms/plugin-pages";
import ResendPlugin from "@lucidcms/plugin-resend";
import BlogCollection from "./src/lucid/collections/blogs.js";
import MainMenuCollection from "./src/lucid/collections/main-menu.js";
import PageCollection from "./src/lucid/collections/pages.js";
import SettingsCollection from "./src/lucid/collections/settings.js";
import SimpleCollection from "./src/lucid/collections/simple.js";
import TestCollection from "./src/lucid/collections/test.js";

export const env = z.object({
	LIBSQL_URL: z.string(),
	LIBSQL_AUTH_TOKEN: z.string().optional(),
	LUCID_ENCRYPTION_SECRET: z.string(),
	LUCID_COOKIE_SECRET: z.string(),
	LUCID_REFRESH_TOKEN_SECRET: z.string(),
	LUCID_ACCESS_TOKEN_SECRET: z.string(),
	LUCID_RESEND_API_KEY: z.string(),
	LUCID_RESEND_WEBHOOK_SECRET: z.string(),
	LUCID_MEDIA_BUCKET: z.any(),
	LUCID_KV: z.any(),
	LUCID_QUEUE: z.any(),
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
		brand: {
			name: "Playground",
		},
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
				fileSize: 100 * 1024 * 1024,
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
			CloudflareR2Plugin({
				binding: env.LUCID_MEDIA_BUCKET,
			}),
			ResendPlugin({
				apiKey: env.LUCID_RESEND_API_KEY,
				webhook: {
					enabled: true,
					secret: env.LUCID_RESEND_WEBHOOK_SECRET,
				},
			}),
		],
	}),
});
