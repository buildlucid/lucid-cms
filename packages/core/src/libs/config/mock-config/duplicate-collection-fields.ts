import { copy, defineCollection, defineConfig, field } from "@lucidcms/core";
import { node } from "@lucidcms/node";
import { sqlite } from "@lucidcms/sqlite";
import testingConstants from "../../../constants/testing-constants.js";

const collection = defineCollection({
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
	fields: [field.text("title"), field.text("title")],
});

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
		collections: [collection],
		plugins: [],
	}),
});
