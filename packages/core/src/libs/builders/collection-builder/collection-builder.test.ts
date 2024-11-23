import { expect, test } from "vitest";
import CollectionBuilder from "./index.js";

test("collection config is correct along with field includes and filters", async () => {
	const pagesCollection = new CollectionBuilder("pages", {
		mode: "multiple",
		details: {
			name: "Pages",
			singularName: {
				en: "Page",
			},
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
			collection: {
				column: true,
				filterable: true,
			},
		})
		.addTextarea("textarea_test", {
			collection: {
				column: true,
				filterable: true,
			},
		})
		.addNumber("number_test", {
			collection: {
				column: true,
				filterable: true,
			},
		})
		.addCheckbox("checkbox_test", {
			collection: {
				column: true,
				filterable: true,
			},
		})
		.addSelect("select_test", {
			collection: {
				column: true,
				filterable: true,
			},
		})
		.addDateTime("datetime_test", {
			collection: {
				column: true,
				filterable: true,
			},
		})
		.addUser("user_test", {
			collection: {
				column: true,
			},
		})
		.addMedia("media_test", {
			collection: {
				column: true,
				filterable: true,
			},
		})
		.addWysiwyg("wysiwyg_test")
		.addLink("link_test")
		.addJSON("json_test")
		.addColour("colour_test")
		.addRepeater("repeater_test")
		.addText("repeater_text_test")
		.endRepeater();

	expect(pagesCollection.fields.size).toBe(14);

	expect(pagesCollection.getData).toEqual({
		key: "pages",
		mode: "multiple",
		details: {
			name: "Pages",
			singularName: {
				en: "Page",
			},
			summary: "Pages are used to create static content on your website.",
		},
		config: {
			isLocked: false,
			useDrafts: false,
			useRevisions: false,
			useTranslations: true,
			fields: {
				filter: [
					{ key: "text_test", type: "text" },
					{ key: "textarea_test", type: "textarea" },
					{ key: "number_test", type: "number" },
					{ key: "checkbox_test", type: "checkbox" },
					{ key: "select_test", type: "select" },
					{ key: "datetime_test", type: "datetime" },
					{ key: "media_test", type: "media" },
				],
				include: [
					"text_test",
					"textarea_test",
					"number_test",
					"checkbox_test",
					"select_test",
					"datetime_test",
					"user_test",
					"media_test",
				],
			},
		},
	});
});
