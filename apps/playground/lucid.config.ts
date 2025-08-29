import lucid, { passthroughImageProcessor } from "@lucidcms/core";
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

export default defineConfig((env) => ({
	host: "http://localhost:6543",
	// cors: {
	// 	origin: [],
	// },
	logger: {
		level: "silent",
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
		LucidNodemailer({
			from: {
				email: "team@lucidjs.build",
				name: "Lucid CMS",
			},
			transporter: transporter,
		}),
		// LucidResend({
		// 	from: {
		// 		email: "admin@ui.protodigital.co.uk",
		// 		name: "Lucid",
		// 	},
		// 	apiKey: env?.RESEND_API_KEY as string,
		// }),
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
			secretKey: env?.LUCID_LOCAL_STORAGE_SECRET_KEY as string,
		}),
	],
	// compilerOptions: {
	// 	outDir: "out",
	// },
}));
