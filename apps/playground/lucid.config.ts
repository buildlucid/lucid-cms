import lucid from "@lucidcms/core";
import {
	SQLiteAdapter,
	PostgresAdapter,
	LibSQLAdapter,
} from "@lucidcms/core/adapters";
import Database from "better-sqlite3";
import transporter from "./src/services/email-transporter.js";
// Plugins
import LucidNodemailer from "@lucidcms/plugin-nodemailer";
import LucidS3 from "@lucidcms/plugin-s3";
import LucidPages from "@lucidcms/plugin-pages";
import LucidLocalStorage from "@lucidcms/plugin-local-storage";
// Collections
import PageCollection from "./src/lucid/collections/pages.js";
import BlogCollection from "./src/lucid/collections/blogs.js";
import MainMenuCollection from "./src/lucid/collections/main-menu.js";
import SettingsCollection from "./src/lucid/collections/settings.js";
import TestCollection from "./src/lucid/collections/test.js";

export default lucid.config({
	host: "http://[::1]:8080",
	db: new SQLiteAdapter({
		database: async () => new Database("db.sqlite"),
	}),
	// db: new PostgresAdapter({
	// 	connectionString: process.env.DATABASE_URL as string,
	// }),
	// db: new LibSQLAdapter({
	// 	url: "libsql://lucid-willyallop.turso.io",
	// 	authToken: process.env.TURSO_AUTH_TOKEN as string,
	// }),
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
	// disableSwagger: true,
	media: {
		// maxSize: 200 * 1024 * 1024,
		processed: {
			store: true,
		},
		fallbackImage: "https://placehold.co/600x400",
	},
	// hooks: [
	// 	{
	// 		service: "collection-documents",
	// 		event: "beforeUpsert",
	// 		handler: async (context, data) => {
	// 			console.log("collection doc hook", data.meta.collectionKey);
	// 		},
	// 	},
	// ],
	fastifyExtensions: [
		async (fastify) => {
			fastify.get("/config-test", (req, reply) => {
				reply.send("Hello World");
			});
		},
	],
	collections: [
		PageCollection,
		BlogCollection,
		MainMenuCollection,
		SettingsCollection,
		TestCollection,
	],
	plugins: [
		LucidPages({
			collections: [
				{
					collectionKey: "page",
					useTranslations: true,
					displayFullSlug: false,
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
				email: "admin@lucidcms.io",
				name: "Lucid",
			},
			transporter: transporter,
		}),
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
		LucidLocalStorage({
			uploadDir: "uploads",
			secretKey: process.env.LUCID_LOCAL_STORAGE_SECRET_KEY as string,
		}),
	],
});
