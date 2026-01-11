import { z } from "@lucidcms/core";
import { defineConfig, nodeAdapter } from "@lucidcms/node-adapter";
import PagesPlugin from "@lucidcms/plugin-pages";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";
import NewsCollection from "./src/collections/news.js";
import PageCollection from "./src/collections/pages.js";
import SettingsCollection from "./src/collections/settings.js";

export const adapter = nodeAdapter();

export const envSchema = z.object({
	LUCID_HOST: z.string(),
	LUCID_ENCRYPTION_KEY: z.string(),
	LUCID_COOKIE_SECRET: z.string(),
	LUCID_REFRESH_TOKEN_SECRET: z.string(),
	LUCID_ACCESS_TOKEN_SECRET: z.string(),
});

export default defineConfig((env) => ({
	host: env.LUCID_HOST,
	db: new SQLiteAdapter({
		database: async () => new Database("db.sqlite"),
	}),
	keys: {
		encryptionKey: env.LUCID_ENCRYPTION_KEY,
		cookieSecret: env.LUCID_COOKIE_SECRET,
		refreshTokenSecret: env.LUCID_REFRESH_TOKEN_SECRET,
		accessTokenSecret: env.LUCID_ACCESS_TOKEN_SECRET,
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
}));
