// import CloudflareQueuesPlugin from "@lucidcms/plugin-cloudflare-queues";
// import RedisPlugin from "@lucidcms/plugin-redis";
// import CloudflareKVPlugin from "@lucidcms/plugin-cloudflare-kv";
import GitHubAuth from "@lucidcms/auth-github";
import GoogleAuth from "@lucidcms/auth-google";
import MicrosoftAuth from "@lucidcms/auth-microsoft";
import { z } from "@lucidcms/core";
import { passthroughEmailAdapter } from "@lucidcms/core/email-adapter";
import { passthroughImageProcessor } from "@lucidcms/core/image-processor";
import { fileSystemMediaAdapter } from "@lucidcms/core/media-adapter";
import {
	passthroughQueueAdapter,
	workerQueueAdapter,
} from "@lucidcms/core/queue-adapter";
// import { cloudflareAdapter, defineConfig } from "@lucidcms/cloudflare-adapter";
// Plugins
import LibSQLAdapter from "@lucidcms/libsql-adapter";
// Adapters
import { defineConfig, nodeAdapter } from "@lucidcms/node-adapter";
import NodemailerPlugin from "@lucidcms/plugin-nodemailer";
import PagesPlugin from "@lucidcms/plugin-pages";
import ResendPlugin from "@lucidcms/plugin-resend";
import S3Plugin from "@lucidcms/plugin-s3";
import PostgresAdapter from "@lucidcms/postgres-adapter";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";
import { describeRoute } from "hono-openapi";
import BlogCollection from "./src/collections/blogs.js";
import MainMenuCollection from "./src/collections/main-menu.js";
// Collections
import PageCollection from "./src/collections/pages.js";
import SettingsCollection from "./src/collections/settings.js";
import SimpleCollection from "./src/collections/simple.js";
import TestCollection from "./src/collections/test.js";
import transporter from "./src/services/email-transporter.js";

export const adapter = nodeAdapter();
// export const adapter = cloudflareAdapter();

export const envSchema = z.object({
	DATABASE_URL: z.string(),
	LUCID_ENCRYPTION_SECRET: z.string(),
	LUCID_COOKIE_SECRET: z.string(),
	LUCID_REFRESH_TOKEN_SECRET: z.string(),
	LUCID_ACCESS_TOKEN_SECRET: z.string(),
	LUCID_LOCAL_STORAGE_SECRET_KEY: z.string(),
	LUCID_RESEND_API_KEY: z.string(),
	LUCID_RESEND_WEBHOOK_SECRET: z.string(),
	GITHUB_CLIENT_ID: z.string(),
	GITHUB_CLIENT_SECRET: z.string(),
	GOOGLE_CLIENT_ID: z.string(),
	GOOGLE_CLIENT_SECRET: z.string(),
	MICROSOFT_CLIENT_ID: z.string(),
	MICROSOFT_CLIENT_SECRET: z.string(),
	MICROSOFT_TENANT_ID: z.string(),
	// REDIS_CONNECTION: z.string(),
});

export default defineConfig((env) => ({
	host: "http://localhost:6543",
	// host: "https://lucidcms-86.localcan.dev",
	// host: "https://cms.lucidjs.build",
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
	auth: {
		password: {
			enabled: true,
		},
	},
	secrets: {
		encryption: env.LUCID_ENCRYPTION_SECRET,
		cookie: env.LUCID_COOKIE_SECRET,
		refreshToken: env.LUCID_REFRESH_TOKEN_SECRET,
		accessToken: env.LUCID_ACCESS_TOKEN_SECRET,
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
		// adapter: fileSystemMediaAdapter({
		// 	uploadDir: "uploads",
		// 	secretKey: env.LUCID_LOCAL_STORAGE_SECRET_KEY,
		// }),
		maxFileSize: 200 * 1024 * 1024, // 200MB
		processedImageLimit: 10,
		storeProcessedImages: true,
		onDemandFormats: true,
		fallback: {
			image: "https://placehold.co/600x400",
			video: "https://cdn.pixabay.com/video/2026/01/05/326081_large.mp4",
		},
		// imageProcessor: passthroughImageProcessor,
		// urlStrategy: (media) => {
		// 	return `https://media.protodigital.co.uk/${media.key}`;
		// },
	},
	// email: {
	// 	adapter: passthroughEmailAdapter,
	// },
	queue: {
		// adapter: passthroughQueueAdapter,
		// adapter: passthroughQueueAdapter({
		// 	bypassImmediateExecution: false,
		// }),
		// adapter: workerQueueAdapter(),
		// adapter: workerQueueAdapter({
		// 	concurrentLimit: 10,
		// 	batchSize: 3,
		// }),
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
	collections: [
		PageCollection,
		BlogCollection,
		MainMenuCollection,
		SettingsCollection,
		TestCollection,
		SimpleCollection,
	],
	plugins: [
		GitHubAuth({
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
		}),
		GoogleAuth({
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		}),
		MicrosoftAuth({
			clientId: env.MICROSOFT_CLIENT_ID,
			clientSecret: env.MICROSOFT_CLIENT_SECRET,
			tenant: env.MICROSOFT_TENANT_ID,
		}),
		PagesPlugin({
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
		// RedisPlugin({
		// 	connection: env.REDIS_CONNECTION,
		// }),
		// NodemailerPlugin({
		// 	transporter: transporter,
		// }),
		// ResendPlugin({
		// 	apiKey: env.LUCID_RESEND_API_KEY,
		// 	webhook: {
		// 		enabled: true,
		// 		secret: env.LUCID_RESEND_WEBHOOK_SECRET,
		// 	},
		// }),
		// S3Plugin({
		// 	endpoint: `https://${env?.LUCID_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		// 	bucket: "headless-cms",
		// 	clientOptions: {
		// 		region: "auto",
		// 		accessKeyId: env?.LUCID_S3_ACCESS_KEY as string,
		// 		secretAccessKey: env?.LUCID_S3_SECRET_KEY as string,
		// 	},
		// }),
	],
	// compilerOptions: {
	// 	paths: {
	// 		outDir: "out",
	// 	},
	// },
}));
