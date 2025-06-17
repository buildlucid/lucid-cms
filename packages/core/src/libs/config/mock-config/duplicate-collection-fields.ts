import lucid from "../../../index.js";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import NodeAdapter from "@lucidcms/node-adapter";
import { CollectionBuilder } from "../../../builders.js";
import Database from "better-sqlite3";
import testingConstants from "../../../constants/testing-constants.js";

const collection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: "Pages",
		singularName: "Page",
	},
})
	.addText("title")
	.addText("title");

export default lucid.config({
	host: "http://localhost:8080",
	adapter: NodeAdapter,
	db: new SQLiteAdapter({
		database: async () => new Database(":memory:"),
	}),
	keys: {
		encryptionKey: testingConstants.key,
		cookieSecret: testingConstants.key,
		refreshTokenSecret: testingConstants.key,
		accessTokenSecret: testingConstants.key,
	},
	collections: [collection],
	plugins: [],
});
