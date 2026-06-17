import { CollectionBuilder, configureLucid, copy } from "@lucidcms/core";
import { node } from "@lucidcms/node-adapter";
import { sqlite } from "@lucidcms/sqlite-adapter";
import testingConstants from "../../../constants/testing-constants.js";

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
		collections: [
			new CollectionBuilder("page", {
				mode: "multiple",
				details: {
					name: copy("admin:tests.collections.pages.name", {
						defaultMessage: "Pages",
					}),
					singularName: copy("admin:tests.collections.pages.singularName", {
						defaultMessage: "Page",
					}),
				},
			}),
			new CollectionBuilder("page", {
				mode: "multiple",
				details: {
					name: copy("admin:tests.collections.pages.name", {
						defaultMessage: "Pages",
					}),
					singularName: copy("admin:tests.collections.pages.singularName", {
						defaultMessage: "Page",
					}),
				},
			}),
		],
		plugins: [],
	}),
});
