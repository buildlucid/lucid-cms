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
			translations: true,
		},
		hooks: [
			{
				event: "beforeUpsert",
				handler: async () => {
					return {
						error: undefined,
						data: undefined,
					};
				},
			},
			{
				event: "beforeDelete",
				handler: async () => {
					return {
						error: undefined,
						data: undefined,
					};
				},
			},
			{
				event: "afterDelete",
				handler: async () => {
					return {
						error: undefined,
						data: undefined,
					};
				},
			},
			{
				event: "afterUpsert",
				handler: async () => {
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
		})
		.addNumber("number_test", {
			displayInListing: true,
		})
		.addCheckbox("checkbox_test", {
			displayInListing: true,
		})
		.addSelect("select_test", {
			displayInListing: true,
		})
		.addDateTime("datetime_test", {
			displayInListing: true,
		})
		.addUser("user_test", {
			displayInListing: true,
		})
		.addMedia("media_test", {
			displayInListing: true,
		})
		.addRichText("rich_text_test")
		.addLink("link_test")
		.addJSON("json_test")
		.addColor("color_test")
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
		permissions: {},
		config: {
			locked: false,
			revisions: false,
			translations: true,
			autoSave: false,
			scheduling: false,
			displayInListing: [
				"text_test",
				"textarea_test",
				"number_test",
				"checkbox_test",
				"select_test",
				"datetime_test",
				"user_test",
				"media_test",
			],
			environments: [],
			revisionRetentionDays: 30,
		},
	});
});

test("collection workflow config normalizes defaults", async () => {
	const collection = new CollectionBuilder("pages", {
		mode: "multiple",
		details: {
			name: "Pages",
			singularName: "Page",
		},
		config: {
			environments: [
				{
					key: "production",
					name: "Production",
				},
			],
			workflow: {
				stages: [
					{
						key: "todo",
						name: "To do",
					},
					{
						key: "done",
						name: "Done",
						color: "green",
						publishTargets: ["production"],
						permissions: {
							moveTo: "page:workflow:done",
						},
					},
				],
			},
		},
	});

	expect(collection.getData.config.workflow).toEqual({
		initial: "todo",
		stages: [
			{
				key: "todo",
				name: "To do",
				color: "grey",
				publishTargets: [],
				permissions: {},
			},
			{
				key: "done",
				name: "Done",
				color: "green",
				publishTargets: ["production"],
				permissions: {
					moveTo: "page:workflow:done",
				},
			},
		],
	});
});
