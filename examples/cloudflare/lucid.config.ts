import { cloudflareAdapter, defineConfig } from "@lucidcms/cloudflare-adapter";
import {
	passthroughImageProcessor,
	passthroughKVAdapter,
	passthroughQueueAdapter,
	z,
} from "@lucidcms/core";
import LibSQLAdapter from "@lucidcms/libsql-adapter";
import LucidPages from "@lucidcms/plugin-pages";
import LucidResend from "@lucidcms/plugin-resend";
import LucidS3 from "@lucidcms/plugin-s3";
import NewsCollection from "./src/collections/news.js";
// Collections
import PageCollection from "./src/collections/pages.js";
import SettingsCollection from "./src/collections/settings.js";

export const adapter = cloudflareAdapter();

export const envSchema = z.object({
	LUCID_HOST: z.string(),
	LUCID_TURSO_URL: z.string(),
	LUCID_TURSO_AUTH_TOKEN: z.string(),
	LUCID_ENCRYPTION_KEY: z.string(),
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
});

export default defineConfig((env) => ({
	host: env.LUCID_HOST,
	db: new LibSQLAdapter({
		url: env.LUCID_TURSO_URL,
		authToken: env.LUCID_TURSO_AUTH_TOKEN,
	}),
	keys: {
		encryptionKey: env.LUCID_ENCRYPTION_KEY,
		cookieSecret: env.LUCID_COOKIE_SECRET,
		refreshTokenSecret: env.LUCID_REFRESH_TOKEN_SECRET,
		accessTokenSecret: env.LUCID_ACCESS_TOKEN_SECRET,
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
	disableOpenAPI: true,
	media: {
		urlStrategy: (media) => {
			return `${env.LUCID_MEDIA_URL}/${env.LUCID_S3_BUCKET}/${media.key}`;
		},
	},
	queue: {
		adapter: passthroughQueueAdapter,
	},
	collections: [PageCollection, NewsCollection, SettingsCollection],
	plugins: [
		LucidPages({
			collections: [
				{
					collectionKey: "page",
					useTranslations: true,
					displayFullSlug: false,
				},
			],
		}),
		LucidResend({
			from: {
				email: env.LUCID_RESEND_FROM_EMAIL,
				name: env.LUCID_RESEND_FROM_NAME,
			},
			apiKey: env.LUCID_RESEND_API_KEY,
			simulate: true,
			webhook: {
				enabled: false,
				secret: env.LUCID_RESEND_WEBHOOK_SECRET,
			},
		}),
		LucidS3({
			endpoint: env.LUCID_S3_ENDPOINT,
			bucket: env.LUCID_S3_BUCKET,
			clientOptions: {
				region: "auto",
				accessKeyId: env.LUCID_S3_ACCESS_KEY,
				secretAccessKey: env.LUCID_S3_SECRET_KEY,
			},
		}),
	],
}));
