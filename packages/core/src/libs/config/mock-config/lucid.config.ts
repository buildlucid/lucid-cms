import { configureLucid } from "@lucidcms/core";
import { sqlite } from "@lucidcms/db-sqlite";
import { node } from "@lucidcms/runtime-node";
import testingConstants from "../../../constants/testing-constants.js";

export default configureLucid({
	runtime: node,
	db: sqlite,
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
		plugins: [],
	}),
});
