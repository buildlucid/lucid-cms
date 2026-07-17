import { configureLucid, z } from "@lucidcms/core";
import { sqlite } from "@lucidcms/db-sqlite";
import { filesystemPlugin } from "@lucidcms/plugin-filesystem";
import { pagesPlugin } from "@lucidcms/plugin-pages";
import { sqliteKVPlugin } from "@lucidcms/plugin-sqlite-kv";
import { node } from "@lucidcms/runtime-node";
import BlogCollection from "./src/lucid/collections/blogs.js";
import PageCollection from "./src/lucid/collections/pages.js";

export const env = z.object({
	ENCRYPTION_SECRET: z.string(),
	COOKIE_SECRET: z.string(),
	REFRESH_TOKEN_SECRET: z.string(),
	ACCESS_TOKEN_SECRET: z.string(),
	PREVIEW_ORIGIN: z.url(),
});

export default configureLucid({
	runtime: node,
	db: sqlite,
	config: (env) => ({
		secrets: {
			encryption: env.ENCRYPTION_SECRET,
			cookie: env.COOKIE_SECRET,
			refreshToken: env.REFRESH_TOKEN_SECRET,
			accessToken: env.ACCESS_TOKEN_SECRET,
		},
		localization: {
			locales: [
				{
					label: "English",
					code: "en",
					direction: "ltr",
				},
				{
					label: "French",
					code: "fr",
					direction: "ltr",
				},
			],
			defaultLocale: "en",
		},
		collections: [PageCollection, BlogCollection],
		plugins: [
			sqliteKVPlugin(),
			filesystemPlugin(),
			pagesPlugin({
				collections: [
					{
						collectionKey: PageCollection.key,
						localized: true,
						displayFullSlug: true,
						prefix: {
							en: "en",
							fr: "fr",
						},
					},
				],
			}),
		],
	}),
});
