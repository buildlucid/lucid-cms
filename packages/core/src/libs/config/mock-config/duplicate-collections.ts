import { CollectionBuilder, configureLucid, text } from "@lucidcms/core";
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
		collections: [
			new CollectionBuilder("page", {
				mode: "multiple",
				details: {
					name: text.admin("tests.collections.pages.name", {
						defaultMessage: "Pages",
					}),
					singularName: text.admin("tests.collections.pages.singularName", {
						defaultMessage: "Page",
					}),
				},
			}),
			new CollectionBuilder("page", {
				mode: "multiple",
				details: {
					name: text.admin("tests.collections.pages.name", {
						defaultMessage: "Pages",
					}),
					singularName: text.admin("tests.collections.pages.singularName", {
						defaultMessage: "Page",
					}),
				},
			}),
		],
		plugins: [],
	}),
});
