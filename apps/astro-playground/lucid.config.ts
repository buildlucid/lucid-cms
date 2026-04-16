import { configureLucid } from "@lucidcms/core";
import { passthroughQueueAdapter } from "@lucidcms/core/queue-adapter";
import PagesPlugin from "@lucidcms/plugin-pages";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";
import PagesCollection from "./src/collections/pages.js";

const fixtureSecret =
	"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export default configureLucid({
	adapter: {
		from: "@lucidcms/node-adapter",
	},
	config: () => ({
		db: new SQLiteAdapter({
			database: async () => new Database("./db.sqlite"),
		}),
		logger: {
			level: "silent",
		},
		auth: {
			password: {
				enabled: true,
			},
		},
		queue: {
			adapter: passthroughQueueAdapter(),
		},
		openAPI: {
			enabled: true,
		},
		secrets: {
			encryption: fixtureSecret,
			cookie: fixtureSecret,
			refreshToken: fixtureSecret,
			accessToken: fixtureSecret,
		},
		collections: [PagesCollection],
		plugins: [
			PagesPlugin({
				collections: [
					{
						collectionKey: "page",
						displayFullSlug: true,
					},
				],
			}),
		],
		brand: {
			name: "Astro Playground",
		},
	}),
});
