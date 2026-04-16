import { configureLucid, z } from "@lucidcms/core";
import PagesPlugin from "@lucidcms/plugin-pages";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";
import NewsCollection from "./src/collections/news.js";
import PageCollection from "./src/collections/pages.js";
import SettingsCollection from "./src/collections/settings.js";

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
		db: new SQLiteAdapter({
			database: async () => new Database("db.sqlite"),
		}),
		secrets: {
			encryption: env.ENCRYPTION_SECRET,
			cookie: env.COOKIE_SECRET,
			refreshToken: env.REFRESH_TOKEN_SECRET,
			accessToken: env.ACCESS_TOKEN_SECRET,
		},
		collections: [PageCollection, NewsCollection, SettingsCollection],
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
