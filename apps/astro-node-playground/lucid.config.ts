import { defineConfig, z } from "@lucidcms/core";
import { filesystem } from "@lucidcms/filesystem";
import { node } from "@lucidcms/node";
import { pages } from "@lucidcms/pages";
import { sqlite } from "@lucidcms/sqlite";
import { sqliteKV } from "@lucidcms/sqlite-kv";
import BlogCollection from "./src/lucid/collections/blogs.js";
import PageCollection from "./src/lucid/collections/pages.js";

export const env = z.object({
	ENCRYPTION_SECRET: z.string(),
	COOKIE_SECRET: z.string(),
	REFRESH_TOKEN_SECRET: z.string(),
	ACCESS_TOKEN_SECRET: z.string(),
});

export default defineConfig({
	runtime: node,
	db: sqlite,
	config: (env) => ({
		url: "http://localhost:4321",
		secrets: {
			encryption: env.ENCRYPTION_SECRET,
			cookie: env.COOKIE_SECRET,
			refreshToken: env.REFRESH_TOKEN_SECRET,
			accessToken: env.ACCESS_TOKEN_SECRET,
		},
		collections: [BlogCollection, PageCollection],
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
		plugins: [
			sqliteKV(),
			filesystem(),
			pages({
				collections: [
					{
						key: PageCollection.key,
						localized: true,
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
