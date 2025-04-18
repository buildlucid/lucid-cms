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
			},
		})
		.addTextarea("textarea_test", {
			collection: {
				column: true,
			},
		})
		.addNumber("number_test", {
			collection: {
				column: true,
			},
		})
		.addCheckbox("checkbox_test", {
			collection: {
				column: true,
			},
		})
		.addSelect("select_test", {
			collection: {
				column: true,
			},
		})
		.addDateTime("datetime_test", {
			collection: {
				column: true,
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
				filter: [],
			},
		},
	});
});
