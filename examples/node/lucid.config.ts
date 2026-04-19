import { configureLucid, z } from "@lucidcms/core";
import PagesPlugin from "@lucidcms/plugin-pages";
import PageCollection from "./src/collections/pages.js";

export const env = z.object({
	ENCRYPTION_SECRET: z.string(),
	COOKIE_SECRET: z.string(),
	REFRESH_TOKEN_SECRET: z.string(),
	ACCESS_TOKEN_SECRET: z.string(),
});

export default configureLucid({
	adapter: {
		module: "@lucidcms/node-adapter",
	},
	database: {
		module: "@lucidcms/sqlite-adapter",
		options: {
			database: "db.sqlite",
		},
	},
	config: (env) => ({
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
						collectionKey: PageCollection.key,
						displayFullSlug: true,
					},
				],
			}),
		],
	}),
});
