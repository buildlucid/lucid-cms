import { CollectionBuilder, copy, defineConfig } from "@lucidcms/core";
import { sqlite } from "@lucidcms/db-sqlite";
import { node } from "@lucidcms/runtime-node";
import testingConstants from "../../../constants/testing-constants.js";
export default defineConfig({
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
					labels: {
						singular: copy("admin:tests.collections.pages.singularName", {
							defaultMessage: "Page",
						}),
						plural: copy("admin:tests.collections.pages.name", {
							defaultMessage: "Pages",
						}),
					},
				},
			}),
			new CollectionBuilder("page", {
				mode: "multiple",
				details: {
					labels: {
						singular: copy("admin:tests.collections.pages.singularName", {
							defaultMessage: "Page",
						}),
						plural: copy("admin:tests.collections.pages.name", {
							defaultMessage: "Pages",
						}),
					},
				},
			}),
		],
		plugins: [],
	}),
});
