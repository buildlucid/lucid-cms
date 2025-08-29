import { passthroughImageProcessor } from "@lucidcms/core";
import { cloudflareAdapter, defineConfig } from "@lucidcms/cloudflare-adapter";
import LibSQLAdapter from "@lucidcms/libsql-adapter";
import LucidResend from "@lucidcms/plugin-resend";
import LucidS3 from "@lucidcms/plugin-s3";
import LucidPages from "@lucidcms/plugin-pages";
// Collections
import PageCollection from "./src/collections/pages.js";
import NewsCollection from "./src/collections/news.js";
import SettingsCollection from "./src/collections/settings.js";

export const adapter = cloudflareAdapter();

export default defineConfig((env) => ({
	host: env?.LUCID_HOST as string,
	db: new LibSQLAdapter({
		url: env?.LUCID_TURSO_URL as string,
		authToken: env?.LUCID_TURSO_AUTH_TOKEN as string,
	}),
	keys: {
		encryptionKey: env?.LUCID_ENCRYPTION_KEY as string,
		cookieSecret: env?.LUCID_COOKIE_SECRET as string,
		refreshTokenSecret: env?.LUCID_REFRESH_TOKEN_SECRET as string,
		accessTokenSecret: env?.LUCID_ACCESS_TOKEN_SECRET as string,
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
		imageProcessor: passthroughImageProcessor,
		urlStrategy: (media) => {
			return `${env?.LUCID_MEDIA_URL}/${media.key}`;
		},
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
				email: env?.LUCID_RESEND_FROM_EMAIL as string,
				name: env?.LUCID_RESEND_FROM_NAME as string,
			},
			apiKey: env?.LUCID_RESEND_API_KEY as string,
		}),
		LucidS3({
			endpoint: env?.LUCID_S3_ENDPOINT as string,
			bucket: env?.LUCID_S3_BUCKET as string,
			clientOptions: {
				region: "auto",
				accessKeyId: env?.LUCID_S3_ACCESS_KEY as string,
				secretAccessKey: env?.LUCID_S3_SECRET_KEY as string,
			},
		}),
	],
}));
