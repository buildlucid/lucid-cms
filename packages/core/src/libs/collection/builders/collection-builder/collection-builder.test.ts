import { expect, test } from "vitest";
import { adminText } from "../../../i18n/admin-text.js";
import CollectionBuilder from "./index.js";

test("collection config is correct along with field includes and filters", async () => {
	const pagesCollection = new CollectionBuilder("pages", {
		mode: "multiple",
		details: {
			name: adminText("tests.collections.pages.name", { fallback: "Pages" }),
			singularName: adminText("tests.collections.pages.singularName", {
				fallback: "Page",
			}),
			summary: adminText("tests.collections.pages.summary", {
				fallback: "Pages are used to create static content on your website.",
			}),
		},
		config: {
			localized: true,
		},
		hooks: [
			{
				service: "documents",
				event: "beforeUpsert",
				handler: async () => {
					return {
						error: undefined,
						data: undefined,
					};
				},
			},
			{
				service: "documents",
				event: "beforeDelete",
				handler: async () => {
					return {
						error: undefined,
						data: undefined,
					};
				},
			},
			{
				service: "documents",
				event: "afterDelete",
				handler: async () => {
					return {
						error: undefined,
						data: undefined,
					};
				},
			},
			{
				service: "documents",
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
			name: adminText("tests.collections.pages.name", { fallback: "Pages" }),
			singularName: adminText("tests.collections.pages.singularName", {
				fallback: "Page",
			}),
			summary: adminText("tests.collections.pages.summary", {
				fallback: "Pages are used to create static content on your website.",
			}),
		},
		permissions: {},
		config: {
			locked: false,
			revisions: false,
			localized: true,
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
			name: adminText("tests.collections.pages.name", { fallback: "Pages" }),
			singularName: adminText("tests.collections.pages.singularName", {
				fallback: "Page",
			}),
		},
		config: {
			environments: [
				{
					key: "production",
					name: adminText("tests.environments.production.name", {
						fallback: "Production",
					}),
				},
			],
			workflow: {
				stages: [
					{
						key: "todo",
						name: adminText("tests.workflow.todo.name", { fallback: "To do" }),
					},
					{
						key: "done",
						name: adminText("tests.workflow.done.name", { fallback: "Done" }),
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
				name: adminText("tests.workflow.todo.name", { fallback: "To do" }),
				color: "grey",
				publishTargets: [],
				permissions: {},
			},
			{
				key: "done",
				name: adminText("tests.workflow.done.name", { fallback: "Done" }),
				color: "green",
				publishTargets: ["production"],
				permissions: {
					moveTo: "page:workflow:done",
				},
			},
		],
	});
});

test("collection environment relation config normalizes defaults", async () => {
	const collection = new CollectionBuilder("pages", {
		mode: "multiple",
		details: {
			name: adminText("tests.collections.pages.name", { fallback: "Pages" }),
			singularName: adminText("tests.collections.pages.singularName", {
				fallback: "Page",
			}),
		},
		config: {
			environments: [
				{
					key: "staging",
					name: adminText("tests.environments.staging.name", {
						fallback: "Staging",
					}),
					relations: {
						blog: "signed-off",
					},
				},
				{
					key: "production",
					name: adminText("tests.environments.production.name", {
						fallback: "Production",
					}),
				},
			],
		},
	});

	expect(collection.getData.config.environments).toEqual([
		{
			key: "staging",
			name: adminText("tests.environments.staging.name", {
				fallback: "Staging",
			}),
			permissions: {},
			relations: {
				blog: "signed-off",
			},
		},
		{
			key: "production",
			name: adminText("tests.environments.production.name", {
				fallback: "Production",
			}),
			permissions: {},
			relations: {},
		},
	]);
});
