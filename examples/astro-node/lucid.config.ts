import { configureLucid, z } from "@lucidcms/core";
import PagesPlugin from "@lucidcms/plugin-pages";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";
import PageCollection from "./src/lucid/collections/pages.js";

export const envSchema = z.object({
	ENCRYPTION_SECRET: z.string(),
	COOKIE_SECRET: z.string(),
	REFRESH_TOKEN_SECRET: z.string(),
	ACCESS_TOKEN_SECRET: z.string(),
});

export default configureLucid({
	adapter: {
		from: "@lucidcms/node-adapter",
	},
	config: (env) => ({
		baseUrl: "http://localhost:4321",
		db: new SQLiteAdapter({
			database: async () => new Database("db.sqlite"),
		}),
		secrets: {
			encryption: env.ENCRYPTION_SECRET,
			cookie: env.COOKIE_SECRET,
			refreshToken: env.REFRESH_TOKEN_SECRET,
			accessToken: env.ACCESS_TOKEN_SECRET,
		},
		collections: [PageCollection],
		plugins: [
			PagesPlugin({
				collections: [
					{
						collectionKey: "page",
						useTranslations: true,
						displayFullSlug: false,
					},
				],
			}),
		],
	}),
});
