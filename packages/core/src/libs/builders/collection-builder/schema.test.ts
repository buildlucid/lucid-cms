import { expect, test } from "vitest";
import CollectionBuilder from "./index.js";
import CollectionConfigSchema from "./schema.js";

test("collection builder config passes schema validation", async () => {
	const collection = new CollectionBuilder("pages", {
		mode: "multiple",
		details: {
			name: "Pages",
			singularName: "Page",
			summary: "Pages are used to create static content on your website.",
		},
		config: {
			useTranslations: true,
		},
		hooks: [
			{
				event: "beforeUpsert",
				handler: async (props) => {
					return {
						error: undefined,
						data: undefined,
					};
				},
			},
			{
				event: "beforeDelete",
				handler: async (props) => {
					return {
						error: undefined,
						data: undefined,
					};
				},
			},
			{
				event: "afterDelete",
				handler: async (props) => {
					return {
						error: undefined,
						data: undefined,
					};
				},
			},
			{
				event: "afterUpsert",
				handler: async (props) => {
					return {
						error: undefined,
						data: undefined,
					};
				},
			},
		],
	})
		.addText("text_test", {
			displayInListing: true,
		})
		.addTextarea("textarea_test", {
			displayInListing: true,
		});

	const res = await CollectionConfigSchema.safeParseAsync(collection.config);
	expect(res.success).toBe(true);
});
