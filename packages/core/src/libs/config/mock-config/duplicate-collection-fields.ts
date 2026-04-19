import { CollectionBuilder, configureLucid } from "@lucidcms/core";
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
		collections: [collection],
		plugins: [],
	}),
});
