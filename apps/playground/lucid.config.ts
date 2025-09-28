import {
	passthroughImageProcessor,
	passthroughQueueAdapter,
	z,
} from "@lucidcms/core";
import { describeRoute } from "hono-openapi";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import PostgresAdapter from "@lucidcms/postgres-adapter";
import LibSQLAdapter from "@lucidcms/libsql-adapter";
import Database from "better-sqlite3";
import transporter from "./src/services/email-transporter.js";
import { nodeAdapter, defineConfig } from "@lucidcms/node-adapter";
// import { cloudflareAdapter, defineConfig } from "@lucidcms/cloudflare-adapter";
// Plugins
import LucidNodemailer from "@lucidcms/plugin-nodemailer";
import LucidResend from "@lucidcms/plugin-resend";
import LucidS3 from "@lucidcms/plugin-s3";
import LucidPages from "@lucidcms/plugin-pages";
import LucidLocalStorage from "@lucidcms/plugin-local-storage";
// Collections
import PageCollection from "./src/collections/pages.js";
import BlogCollection from "./src/collections/blogs.js";
import MainMenuCollection from "./src/collections/main-menu.js";
import SettingsCollection from "./src/collections/settings.js";
import TestCollection from "./src/collections/test.js";
import SimpleCollection from "./src/collections/simple.js";
// import postgres from "postgres";

export const adapter = nodeAdapter();
// export const adapter = cloudflareAdapter();

export const envSchema = z.object({
	DATABASE_URL: z.string(),
	LUCID_ENCRYPTION_KEY: z.string(),
	LUCID_COOKIE_SECRET: z.string(),
	LUCID_REFRESH_TOKEN_SECRET: z.string(),
	LUCID_ACCESS_TOKEN_SECRET: z.string(),
	LUCID_LOCAL_STORAGE_SECRET_KEY: z.string(),
	LUCID_RESEND_API_KEY: z.string(),
	LUCID_RESEND_WEBHOOK_SECRET: z.string(),
});

export default defineConfig((env) => ({
	host: "http://localhost:6543",
	// host: "https://cms.lucidjs.build",
	// cors: {
	// 	origin: [],
	// },
	logger: {
		level: "debug",
	},
	db: new SQLiteAdapter({
		database: async () => new Database("db.sqlite"),
	}),
	// db: new PostgresAdapter(env?.DATABASE_URL as string, {
	// 	max: 5,
	// }),
	// db: new LibSQLAdapter({
	// url: "http://127.0.0.1:8081", //"libsql://lucid-willyallop.turso.io",
	// url: "libsql://lucid-cloudflare-willyallop.aws-eu-west-1.turso.io",
	// authToken: env?.TURSO_AUTH_TOKEN as string,
	// }),
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
	disableOpenAPI: false,
	media: {
		maxFileSize: 200 * 1024 * 1024, // 200MB
		processedImageLimit: 10,
		storeProcessedImages: true,
		onDemandFormats: true,
		fallbackImage: "https://placehold.co/600x400",
		imageProcessor: passthroughImageProcessor,
		// urlStrategy: (media) => {
		// 	return `https://media.protodigital.co.uk/${media.key}`;
		// },
	},
	// queue: {
	// adapter: passthroughQueueAdapter,
	// },
	// hooks: [
	// 	{
	// 		service: "documents",
	// 		event: "beforeUpsert",
	// 		handler: async (context, data) => {
	// 			console.log("collection doc hook", data.meta.collectionKey);
	// 		},
	// 	},
	// ],
	hono: {
		extensions: [
			async (app) => {
				app.get(
					"/config-test",
					describeRoute({
						description: "Lucid Hono Extensions",
						tags: ["lucid-hono-extensions"],
						summary: "Testing the lucid hono extensions config",
						validateResponse: true,
					}),
					(c) => {
						// @ts-expect-error
						console.log(c.env?.TEST_ENV_VAR);
						return c.json({
							host: "http://[::1]:6543",
							logLevel: "debug",
						});
					},
				);
			},
		],
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
		LucidPages({
			collections: [
				{
					collectionKey: "page",
					useTranslations: true,
					displayFullSlug: true,
				},
				{
					collectionKey: "test",
					useTranslations: true,
					displayFullSlug: true,
				},
			],
		}),
		// LucidNodemailer({
		// 	from: {
		// 		email: "team@lucidjs.build",
		// 		name: "Lucid CMS",
		// 	},
		// 	transporter: transporter,
		// 	simulate: true,
		// }),
		LucidResend({
			from: {
				email: "team@lucidjs.build",
				name: "Lucid CMS",
			},
			simulate: true,
			apiKey: env.LUCID_RESEND_API_KEY,
			webhook: {
				enabled: true,
				secret: env.LUCID_RESEND_WEBHOOK_SECRET,
			},
		}),
		// LucidS3({
		// 	endpoint: `https://${env?.LUCID_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		// 	bucket: "headless-cms",
		// 	clientOptions: {
		// 		region: "auto",
		// 		accessKeyId: env?.LUCID_S3_ACCESS_KEY as string,
		// 		secretAccessKey: env?.LUCID_S3_SECRET_KEY as string,
		// 	},
		// }),
		LucidLocalStorage({
			uploadDir: "uploads",
			secretKey: env.LUCID_LOCAL_STORAGE_SECRET_KEY,
		}),
	],
	// compilerOptions: {
	// 	outDir: "out",
	// },
}));
