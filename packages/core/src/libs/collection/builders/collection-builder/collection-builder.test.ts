import { expect, test } from "vitest";
import { copy } from "../../../i18n/index.js";
import CollectionBuilder from "./index.js";

test("collection options are correct along with field includes and filters", async () => {
	const pagesCollection = new CollectionBuilder("pages", {
		mode: "multiple",
		details: {
			name: copy("admin:tests.collections.pages.name", {
				defaultMessage: "Pages",
			}),
			singularName: copy("admin:tests.collections.pages.singularName", {
				defaultMessage: "Page",
			}),
			summary: copy("admin:tests.collections.pages.summary", {
				defaultMessage:
					"Pages are used to create static content on your website.",
			}),
		},
		features: {
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
			listing: true,
		})
		.addTextarea("textarea_test", {
			listing: true,
		})
		.addNumber("number_test", {
			listing: true,
		})
		.addCheckbox("checkbox_test", {
			listing: true,
		})
		.addSelect("select_test", {
			listing: true,
		})
		.addDateTime("datetime_test", {
			listing: true,
		})
		.addUser("user_test", {
			listing: true,
		})
		.addMedia("media_test", {
			listing: true,
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
		group: null,
		details: {
			name: copy("admin:tests.collections.pages.name", {
				defaultMessage: "Pages",
			}),
			singularName: copy("admin:tests.collections.pages.singularName", {
				defaultMessage: "Page",
			}),
			summary: copy("admin:tests.collections.pages.summary", {
				defaultMessage:
					"Pages are used to create static content on your website.",
			}),
		},
		permissions: {},
		features: {
			locked: false,
			revisions: false,
			localized: true,
			autoSave: false,
			scheduling: false,
			listing: [
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
		tenants: [],
	});
});

test("collection workflow features normalizes defaults", async () => {
	const collection = new CollectionBuilder("pages", {
		mode: "multiple",
		details: {
			name: copy("admin:tests.collections.pages.name", {
				defaultMessage: "Pages",
			}),
			singularName: copy("admin:tests.collections.pages.singularName", {
				defaultMessage: "Page",
			}),
		},
		features: {
			environments: [
				{
					key: "production",
					name: copy("admin:tests.environments.production.name", {
						defaultMessage: "Production",
					}),
				},
			],
			workflow: {
				stages: [
					{
						key: "todo",
						name: copy("admin:tests.workflow.todo.name", {
							defaultMessage: "To do",
						}),
					},
					{
						key: "done",
						name: copy("admin:tests.workflow.done.name", {
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

	expect(collection.getData.features.workflow).toEqual({
		initial: "todo",
		stages: [
			{
				key: "todo",
				name: copy("admin:tests.workflow.todo.name", {
					defaultMessage: "To do",
				}),
				color: "grey",
				publishTargets: [],
				permissions: {},
			},
			{
				key: "done",
				name: copy("admin:tests.workflow.done.name", {
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

test("collection environment relation features normalizes defaults", async () => {
	const collection = new CollectionBuilder("pages", {
		mode: "multiple",
		details: {
			name: copy("admin:tests.collections.pages.name", {
				defaultMessage: "Pages",
			}),
			singularName: copy("admin:tests.collections.pages.singularName", {
				defaultMessage: "Page",
			}),
		},
		features: {
			environments: [
				{
					key: "staging",
					name: copy("admin:tests.environments.staging.name", {
						defaultMessage: "Staging",
					}),
					relations: {
						blog: "signed-off",
					},
				},
				{
					key: "production",
					name: copy("admin:tests.environments.production.name", {
						defaultMessage: "Production",
					}),
					requires: ["staging"],
				},
			],
		},
	});

	expect(collection.getData.features.environments).toEqual([
		{
			key: "staging",
			name: copy("admin:tests.environments.staging.name", {
				defaultMessage: "Staging",
			}),
			requires: [],
			permissions: {},
			relations: {
				blog: "signed-off",
			},
		},
		{
			key: "production",
			name: copy("admin:tests.environments.production.name", {
				defaultMessage: "Production",
			}),
			requires: ["staging"],
			permissions: {},
			relations: {},
		},
	]);
});

test("collection group config normalizes shorthand and named groups", () => {
	const shorthandCollection = new CollectionBuilder("pages", {
		mode: "multiple",
		group: "content",
		details: {
			name: "Pages",
			singularName: "Page",
		},
	});

	expect(shorthandCollection.getData.group).toEqual({
		key: "content",
		name: null,
		order: null,
	});

	const namedCollection = new CollectionBuilder("blogs", {
		mode: "multiple",
		group: {
			key: "content",
			name: "Content",
			order: 10,
		},
		details: {
			name: "Blogs",
			singularName: "Blog",
		},
	});

	expect(namedCollection.getData.group).toEqual({
		key: "content",
		name: { type: "lucid.literal", value: "Content" },
		order: 10,
	});
});

test("plain string copy on details and fields is normalised to literal copy", () => {
	const collection = new CollectionBuilder("snippets", {
		mode: "multiple",
		details: {
			name: "Snippets",
			singularName: "Snippet",
			summary: "Reusable content snippets.",
		},
	}).addText("title", {
		details: {
			label: "Title",
			placeholder: "Enter a title",
		},
	});

	expect(collection.getData.details).toEqual({
		name: { type: "lucid.literal", value: "Snippets" },
		singularName: { type: "lucid.literal", value: "Snippet" },
		summary: { type: "lucid.literal", value: "Reusable content snippets." },
	});

	const titleField = collection.fieldTree.find(
		(field) => field.key === "title",
	);
	expect(titleField?.details).toMatchObject({
		label: { type: "lucid.literal", value: "Title" },
		placeholder: { type: "lucid.literal", value: "Enter a title" },
	});
});
