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
		// url: "http://127.0.0.1:8081", ,
		url: "libsql://lucid-cloudflare-willyallop.aws-eu-west-1.turso.io",
		authToken: env?.TURSO_AUTH_TOKEN as string,
	}),
	keys: {
		encryptionKey: env?.LUCID_ENCRYPTION_KEY as string,
		cookieSecret: env?.LUCID_COOKIE_SECRET as string,
		refreshTokenSecret: env?.LUCID_REFRESH_TOKEN_SECRET as string,
		accessTokenSecret: env?.LUCID_ACCESS_TOKEN_SECRET as string,
	},
	localisation: {
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
	disableSwagger: true,
	media: {
		maxFileSize: 20 * 1024 * 1024, // 20MB
		processedImageLimit: 10,
		storeProcessedImages: true,
		onDemandFormats: true,
		imageProcessor: passthroughImageProcessor,
		urlStrategy: (media) => {
			return `https://media.protodigital.co.uk/${media.key}`;
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
				email: "admin@ui.protodigital.co.uk",
				name: "Lucid",
			},
			apiKey: env?.RESEND_API_KEY as string,
		}),
		LucidS3({
			endpoint: `https://${env?.LUCID_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
			bucket: "headless-cms",
			clientOptions: {
				region: "auto",
				accessKeyId: env?.LUCID_S3_ACCESS_KEY as string,
				secretAccessKey: env?.LUCID_S3_SECRET_KEY as string,
			},
		}),
	],
}));
