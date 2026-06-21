import { configureLucid, z } from "@lucidcms/core";
import { libsql } from "@lucidcms/db-libsql";
import { cloudflareKVPlugin } from "@lucidcms/plugin-cloudflare-kv";
import { cloudflareQueuesPlugin } from "@lucidcms/plugin-cloudflare-queues";
import { cloudflareR2Plugin } from "@lucidcms/plugin-cloudflare-r2";
import { pagesPlugin } from "@lucidcms/plugin-pages";
import { resendPlugin } from "@lucidcms/plugin-resend";
import { cloudflare } from "@lucidcms/runtime-cloudflare";
import BlogCollection from "./src/lucid/collections/blogs.js";
import MainMenuCollection from "./src/lucid/collections/main-menu.js";
import PageCollection from "./src/lucid/collections/pages.js";
import SettingsCollection from "./src/lucid/collections/settings.js";
import SimpleCollection from "./src/lucid/collections/simple.js";
import TestCollection from "./src/lucid/collections/test.js";

export default configureLucid({
	runtime: cloudflare({
		wrangler: {
			bindings: {
				kv: true,
				queues: {
					queueName: "lucid-astro-playground",
					consumer: {
						maxBatchSize: 1,
					},
				},
				r2: {
					bucketName: "lucid-astro-playground-media",
				},
			},
		},
	}),
	db: libsql,
	env: z.object({
		LIBSQL_URL: z.string(),
		LIBSQL_AUTH_TOKEN: z.string().optional(),
		LUCID_ENCRYPTION_SECRET: z.string(),
		LUCID_COOKIE_SECRET: z.string(),
		LUCID_REFRESH_TOKEN_SECRET: z.string(),
		LUCID_ACCESS_TOKEN_SECRET: z.string(),
		LUCID_RESEND_API_KEY: z.string(),
		LUCID_RESEND_WEBHOOK_SECRET: z.string(),
	}),
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
					direction: "ltr",
				},
				{
					label: "French",
					code: "fr",
					direction: "ltr",
				},
			],
			defaultLocale: "en",
		},
		i18n: {
			locales: [
				{
					label: "English",
					code: "en",
					direction: "ltr",
				},
				{
					label: "French",
					code: "fr",
					direction: "ltr",
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
			pagesPlugin({
				collections: [
					{
						collectionKey: PageCollection.key,
						localized: true,
						displayFullSlug: true,
						prefix: {
							en: "en",
							fr: "fr",
						},
					},
					{
						collectionKey: TestCollection.key,
						localized: true,
						displayFullSlug: true,
					},
				],
			}),
			cloudflareKVPlugin(),
			cloudflareQueuesPlugin(),
			cloudflareR2Plugin(),
			resendPlugin({
				apiKey: env.LUCID_RESEND_API_KEY,
				webhook: {
					enabled: true,
					secret: env.LUCID_RESEND_WEBHOOK_SECRET,
				},
			}),
		],
	}),
});
