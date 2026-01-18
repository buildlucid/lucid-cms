import { CollectionBuilder } from "@lucidcms/core/builders";
import { defineConfig, nodeAdapter } from "@lucidcms/node-adapter";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";
import testingConstants from "../../../constants/testing-constants.js";

export const adapter = nodeAdapter();

const collection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: "Pages",
		singularName: "Page",
	},
})
	.addText("title")
	.addText("title");

export default defineConfig(() => ({
	host: "http://localhost:6543",
	logger: {
		level: "silent",
	},
	db: new SQLiteAdapter({
		database: async () => new Database(":memory:"),
	}),
	secrets: {
		encryption: testingConstants.key,
		cookie: testingConstants.key,
		refreshToken: testingConstants.key,
		accessToken: testingConstants.key,
	},
	collections: [collection],
	plugins: [],
}));
