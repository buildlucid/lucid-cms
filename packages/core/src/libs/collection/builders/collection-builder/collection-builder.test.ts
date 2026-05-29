import { expect, test } from "vitest";
import { text } from "../../../i18n/index.js";
import CollectionBuilder from "./index.js";

test("collection config is correct along with field includes and filters", async () => {
	const pagesCollection = new CollectionBuilder("pages", {
		mode: "multiple",
		details: {
			name: text.admin("tests.collections.pages.name", {
				defaultMessage: "Pages",
			}),
			singularName: text.admin("tests.collections.pages.singularName", {
				defaultMessage: "Page",
			}),
			summary: text.admin("tests.collections.pages.summary", {
				defaultMessage:
					"Pages are used to create static content on your website.",
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
			name: text.admin("tests.collections.pages.name", {
				defaultMessage: "Pages",
			}),
			singularName: text.admin("tests.collections.pages.singularName", {
				defaultMessage: "Page",
			}),
			summary: text.admin("tests.collections.pages.summary", {
				defaultMessage:
					"Pages are used to create static content on your website.",
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
			name: text.admin("tests.collections.pages.name", {
				defaultMessage: "Pages",
			}),
			singularName: text.admin("tests.collections.pages.singularName", {
				defaultMessage: "Page",
			}),
		},
		config: {
			environments: [
				{
					key: "production",
					name: text.admin("tests.environments.production.name", {
						defaultMessage: "Production",
					}),
				},
			],
			workflow: {
				stages: [
					{
						key: "todo",
						name: text.admin("tests.workflow.todo.name", {
							defaultMessage: "To do",
						}),
					},
					{
						key: "done",
						name: text.admin("tests.workflow.done.name", {
							defaultMessage: "Done",
						}),
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
				name: text.admin("tests.workflow.todo.name", {
					defaultMessage: "To do",
				}),
				color: "grey",
				publishTargets: [],
				permissions: {},
			},
			{
				key: "done",
				name: text.admin("tests.workflow.done.name", {
					defaultMessage: "Done",
				}),
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
			name: text.admin("tests.collections.pages.name", {
				defaultMessage: "Pages",
			}),
			singularName: text.admin("tests.collections.pages.singularName", {
				defaultMessage: "Page",
			}),
		},
		config: {
			environments: [
				{
					key: "staging",
					name: text.admin("tests.environments.staging.name", {
						defaultMessage: "Staging",
					}),
					relations: {
						blog: "signed-off",
					},
				},
				{
					key: "production",
					name: text.admin("tests.environments.production.name", {
						defaultMessage: "Production",
					}),
				},
			],
		},
	});

	expect(collection.getData.config.environments).toEqual([
		{
			key: "staging",
			name: text.admin("tests.environments.staging.name", {
				defaultMessage: "Staging",
			}),
			permissions: {},
			relations: {
				blog: "signed-off",
			},
		},
		{
			key: "production",
			name: text.admin("tests.environments.production.name", {
				defaultMessage: "Production",
			}),
			permissions: {},
			relations: {},
		},
	]);
});
