import lucid, { passthroughImageProcessor } from "@lucidcms/core";
import { describeRoute } from "hono-openapi";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import PostgresAdapter from "@lucidcms/postgres-adapter";
import LibSQLAdapter from "@lucidcms/libsql-adapter";
import Database from "better-sqlite3";
import transporter from "./src/services/email-transporter.js";
import NodeAdapter from "@lucidcms/node-adapter";
import CloudflareAdapter from "@lucidcms/cloudflare-adapter";
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

export default lucid.config({
	host: "http://localhost:8787",
	logLevel: "debug",
	// adapter: NodeAdapter(),
	adapter: CloudflareAdapter(),
	// db: new SQLiteAdapter({
	// 	database: async () => new Database("db.sqlite"),
	// }),
	// db: new PostgresAdapter(process.env.DATABASE_URL as string, {
	// 	max: 5,
	// 	// fetch_types: false,
	// 	debug: true,
	// }),
	db: new LibSQLAdapter({
		// url: "http://127.0.0.1:8081", //"libsql://lucid-willyallop.turso.io",
		url: "libsql://lucid-cloudflare-willyallop.aws-eu-west-1.turso.io",
		authToken: process.env.TURSO_AUTH_TOKEN as string,
	}),
	keys: {
		encryptionKey: process.env.LUCID_ENCRYPTION_KEY as string,
		cookieSecret: process.env.LUCID_COOKIE_SECRET as string,
		refreshTokenSecret: process.env.LUCID_REFRESH_TOKEN_SECRET as string,
		accessTokenSecret: process.env.LUCID_ACCESS_TOKEN_SECRET as string,
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
	disableSwagger: false,
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
	honoExtensions: [
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
						host: "http://[::1]:8080",
						logLevel: "debug",
					});
				},
			);
			// app.get(
			// 	"/db-test",
			// 	describeRoute({
			// 		description: "Lucid Hono Extensions",
			// 		tags: ["lucid-hono-extensions"],
			// 		summary: "Testing the lucid hono extensions config",
			// 		validateResponse: true,
			// 	}),
			// 	async (c) => {
			// 		console.log("Starting raw postgres test");

			// 		// @ts-expect-error
			// 		const sql = postgres(c.env?.HYPERDRIVE?.connectionString as string, {
			// 			max: 5,
			// 			fetch_types: false,
			// 		});

			// 		try {
			// 			console.log("About to execute query");
			// 			const result = await sql`SELECT 1 as test`;
			// 			console.log("Query completed:", result);

			// 			await sql.end();
			// 			console.log("Connection closed");

			// 			return c.json({ success: true, result });
			// 		} catch (error) {
			// 			console.log("Error:", error);
			// 			await sql.end();
			// 			throw error;
			// 		}
			// 	},
			// );
		},
	],
	collections: [
		PageCollection,
		BlogCollection,
		MainMenuCollection,
		SettingsCollection,
		TestCollection,
		SimpleCollection,
	],
	plugins: [
		// LucidPages({
		// 	collections: [
		// 		{
		// 			collectionKey: "page",
		// 			useTranslations: true,
		// 			displayFullSlug: true,
		// 		},
		// 		{
		// 			collectionKey: "test",
		// 			useTranslations: true,
		// 			displayFullSlug: true,
		// 		},
		// 	],
		// }),
		// LucidNodemailer({
		// 	from: {
		// 		email: "admin@lucidcms.io",
		// 		name: "Lucid",
		// 	},
		// 	transporter: transporter,
		// }),
		// LucidResend({
		// 	from: {
		// 		email: "admin@ui.protodigital.co.uk",
		// 		name: "Lucid",
		// 	},
		// 	apiKey: process.env.RESEND_API_KEY as string,
		// }),
		// LucidS3({
		// 	clientConfig: {
		// 		endpoint: `https://${process.env.LUCID_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		// 		region: "auto",
		// 		credentials: {
		// 			accessKeyId: process.env.LUCID_S3_ACCESS_KEY as string,
		// 			secretAccessKey: process.env.LUCID_S3_SECRET_KEY as string,
		// 		},
		// 	},
		// 	bucket: "headless-cms",
		// }),
		// LucidLocalStorage({
		// 	uploadDir: "uploads",
		// 	secretKey: process.env.LUCID_LOCAL_STORAGE_SECRET_KEY as string,
		// }),
	],
	// compilerOptions: {
	// 	outDir: "out",
	// },
});
