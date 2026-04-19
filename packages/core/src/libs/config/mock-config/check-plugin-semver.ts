import { configureLucid } from "@lucidcms/core";
import testingConstants from "../../../constants/testing-constants.js";

export default configureLucid({
	adapter: {
		module: "@lucidcms/node-adapter",
	},
	database: {
		module: "@lucidcms/sqlite-adapter",
		options: {
			database: ":memory:",
		},
	},
	config: () => ({
		logger: {
			level: "silent",
		},
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
	}),
});
