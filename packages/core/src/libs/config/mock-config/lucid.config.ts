import { configureLucid } from "@lucidcms/core";
import { node } from "@lucidcms/node-adapter";
import { sqlite } from "@lucidcms/sqlite-adapter";
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
