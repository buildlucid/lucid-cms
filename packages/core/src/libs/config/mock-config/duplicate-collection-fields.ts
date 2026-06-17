import { CollectionBuilder, configureLucid, copy } from "@lucidcms/core";
import { sqlite } from "@lucidcms/db-sqlite";
import { node } from "@lucidcms/runtime-node";
import testingConstants from "../../../constants/testing-constants.js";

const collection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: copy("admin:tests.collections.pages.name", {
			defaultMessage: "Pages",
		}),
		singularName: copy("admin:tests.collections.pages.singularName", {
			defaultMessage: "Page",
		}),
	},
})
	.addText("title")
	.addText("title");

export default configureLucid({
	runtime: node,
	db: sqlite({
		database: ":memory:",
	}),
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
