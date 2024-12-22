import lucid from "../../../index.js";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";
import testingConstants from "../../../constants/testing-constants.js";

export default lucid.config({
	host: "http://localhost:8080",
	db: new SQLiteAdapter({
		database: async () => new Database(":memory:"),
	}),
	keys: {
		encryptionKey: testingConstants.key,
		cookieSecret: testingConstants.key,
		refreshTokenSecret: testingConstants.key,
		accessTokenSecret: testingConstants.key,
	},
	collections: [],
	plugins: [],
});
