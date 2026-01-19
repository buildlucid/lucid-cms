import { defineConfig, nodeAdapter } from "@lucidcms/node-adapter";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";
import testingConstants from "../../../constants/testing-constants.js";

export const adapter = nodeAdapter();

export default defineConfig(() => ({
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
	collections: [],
	plugins: [
		{
			key: "plugin-testing",
			lucid: "100.0.0",
			recipe: () => {},
		},
	],
}));
