import { copy, defineCollection, defineConfig } from "@lucidcms/core";
import { node } from "@lucidcms/node";
import { sqlite } from "@lucidcms/sqlite";
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
		url: "http://localhost:6543",
		secrets: {
			encryption: testingConstants.key,
			cookie: testingConstants.key,
			refreshToken: testingConstants.key,
			accessToken: testingConstants.key,
		},
		collections: [
			defineCollection({
				key: "page",
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
			defineCollection({
				key: "page",
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
