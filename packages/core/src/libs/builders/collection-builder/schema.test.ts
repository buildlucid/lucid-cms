import { expect, test } from "vitest";
import CollectionBuilder from "./index.js";
import CollectionConfigSchema from "./schema.js";

test("collection builder config passes schema validation", async () => {
	const collection = new CollectionBuilder("pages", {
		mode: "multiple",
		title: "Pages",
		singular: "Page",
		description: "Pages are used to create static content on your website.",
		useTranslations: true,
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
		.addText("text_test", undefined, {
			list: true,
			filterable: true,
		})
		.addTextarea("textarea_test", undefined, {
			list: true,
			filterable: true,
		});

	const res = await CollectionConfigSchema.safeParseAsync(collection.config);
	expect(res.success).toBe(true);
});
