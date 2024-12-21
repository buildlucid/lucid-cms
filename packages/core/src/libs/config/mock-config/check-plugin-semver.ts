import lucid from "../../../index.js";
import { SQLiteAdapter } from "../../../adapters.js";
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
	plugins: [
		async (config) => {
			return {
				config: config,
				key: "plugin-testing",
				lucid: "100.0.0",
			};
		},
	],
});
