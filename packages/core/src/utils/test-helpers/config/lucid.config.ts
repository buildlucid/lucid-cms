import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import { nodeAdapter, defineConfig } from "@lucidcms/node-adapter";
import Database from "better-sqlite3";
import testingConstants from "../../../constants/testing-constants.js";

export const adapter = nodeAdapter();

export default defineConfig((env) => ({
	host: "http://localhost:6543",
	db: new SQLiteAdapter({
		database: async () => new Database(":memory:"),
	}),
	logger: {
		level: "silent",
	},
	keys: {
		encryptionKey: testingConstants.key,
		cookieSecret: testingConstants.key,
		refreshTokenSecret: testingConstants.key,
		accessTokenSecret: testingConstants.key,
	},
	collections: [],
	plugins: [],
}));
