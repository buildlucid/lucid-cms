import { CollectionBuilder, configureLucid, text } from "@lucidcms/core";
import testingConstants from "../../../constants/testing-constants.js";

const collection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: text.admin("tests.collections.pages.name", {
			defaultMessage: "Pages",
		}),
		singularName: text.admin("tests.collections.pages.singularName", {
			defaultMessage: "Page",
		}),
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
