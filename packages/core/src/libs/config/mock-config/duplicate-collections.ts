import { CollectionBuilder } from "@lucidcms/core/builders";
import { defineConfig, nodeAdapter } from "@lucidcms/node-adapter";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";
import testingConstants from "../../../constants/testing-constants.js";

export const adapter = nodeAdapter();

export default defineConfig(() => ({
	db: new SQLiteAdapter({
		database: async () => new Database(":memory:"),
	}),
	logger: {
		level: "silent",
	},
	secrets: {
		encryption: testingConstants.key,
		cookie: testingConstants.key,
		refreshToken: testingConstants.key,
		accessToken: testingConstants.key,
	},
	collections: [
		new CollectionBuilder("page", {
			mode: "multiple",
			details: {
				name: "Pages",
				singularName: "Page",
			},
		}),
		new CollectionBuilder("page", {
			mode: "multiple",
			details: {
				name: "Pages",
				singularName: "Page",
			},
		}),
	],
	plugins: [],
}));
