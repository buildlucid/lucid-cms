import { configureLucid, z } from "@lucidcms/core";
import { node } from "@lucidcms/node-adapter";
import { filesystemPlugin } from "@lucidcms/plugin-filesystem";
import { pagesPlugin } from "@lucidcms/plugin-pages";
import { sqliteKVPlugin } from "@lucidcms/plugin-sqlite-kv";
import { sqlite } from "@lucidcms/sqlite-adapter";
import PageCollection from "./src/lucid/collections/pages.js";

export const env = z.object({
	ENCRYPTION_SECRET: z.string(),
	COOKIE_SECRET: z.string(),
	REFRESH_TOKEN_SECRET: z.string(),
	ACCESS_TOKEN_SECRET: z.string(),
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
		collections: [PageCollection],
		plugins: [
			sqliteKVPlugin(),
			filesystemPlugin(),
			pagesPlugin({
				collections: [
					{
						collectionKey: PageCollection.key,
						displayFullSlug: true,
					},
				],
			}),
		],
	}),
});
