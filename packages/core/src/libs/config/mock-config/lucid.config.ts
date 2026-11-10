import { defineConfig } from "@lucidcms/core";
import { node } from "@lucidcms/node";
import { sqlite } from "@lucidcms/sqlite";
import testingConstants from "../../../constants/testing-constants.js";

export default defineConfig({
	runtime: node,
	db: sqlite,
	config: () => ({
		logger: {
			level: "silent",
		},
		url: "http://localhost:6543",
		secrets: {
			encryption: testingConstants.key,
			cookie: testingConstants.key,
			refreshToken: testingConstants.key,
			accessToken: testingConstants.key,
		},
		collections: [],
		plugins: [],
	}),
});
