import { expect, test } from "vitest";
import collectionsFormatter from "../../../formatters/collections.js";
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
		localized: true,
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
			showInList: true,
			useAsLabel: true,
		})
		.addTextarea("textarea_test", {
			showInList: true,
		})
		.addNumber("number_test", {
			showInList: true,
		})
		.addRange("range_test", {
			showInList: true,
		})
		.addCheckbox("checkbox_test", {
			showInList: true,
		})
		.addSelect("select_test", {
			showInList: true,
		})
		.addDateTime("datetime_test", {
			showInList: true,
		})
		.addUser("user_test", {
			showInList: true,
		})
		.addMedia("media_test", {
			showInList: true,
		})
		.addRelation("relation_test", {
			collection: "pages",
			showInList: true,
		})
		.addRichText("rich_text_test")
		.addLink("link_test")
		.addJSON("json_test")
		.addColor("color_test", {
			showInList: true,
		})
		.addRepeater("repeater_test")
		.addText("repeater_text_test")
		.endRepeater();

	expect(pagesCollection.fields.size).toBe(16);

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
		locked: false,
		revisions: false,
		localized: true,
		autoSave: false,
		scheduling: false,
		orderable: false,
		listing: [
			"text_test",
			"textarea_test",
			"number_test",
			"range_test",
			"checkbox_test",
			"select_test",
			"datetime_test",
			"user_test",
			"media_test",
			"relation_test",
			"color_test",
		],
		labelFields: ["text_test"],
		environments: [],
		revisionRetentionDays: 30,
		preview: null,
		tenants: [],
	});
});

test("collection preview configuration exposes normalized breakpoints without private resolver data", () => {
	const preview = async () => new URL("https://example.com/page");
	const collection = new CollectionBuilder("pages", {
		mode: "multiple",
		details: {
			name: "Pages",
			singularName: "Page",
		},
		preview: {
			url: preview,
			expiresIn: 120,
			breakpoints: [
				{
					key: "mobile",
					label: "Mobile",
					width: 390,
				},
				{
					key: "desktop",
					label: copy("admin:tests.preview.desktop"),
					width: 1440,
				},
			],
		},
	});

	expect(collection.getData.preview).toEqual({
		breakpoints: [
			{
				key: "mobile",
				label: {
					type: "lucid.literal",
					value: "Mobile",
				},
				width: 390,
			},
			{
				key: "desktop",
				label: copy("admin:tests.preview.desktop"),
				width: 1440,
			},
		],
	});
	expect(collection.config.preview?.url).toBe(preview);
	expect(collection.config.preview?.expiresIn).toBe(120);
	const adminCollection = collectionsFormatter.formatSingle({
		collection,
		adminTranslations: {
			"tests.preview.desktop": "Desktop",
		},
	});
	expect(adminCollection.capabilities.preview).toBe(true);
	expect(adminCollection.preview).toEqual({
		breakpoints: [
			{
				key: "mobile",
				label: {
					type: "lucid.literal",
					value: "Mobile",
				},
				width: 390,
			},
			{
				key: "desktop",
				label: copy("admin:tests.preview.desktop", {
					defaultMessage: "Desktop",
				}),
				width: 1440,
			},
		],
	});
	const serializedCollection = JSON.stringify(adminCollection);
	expect(serializedCollection).not.toContain(preview.toString());
	expect(serializedCollection).not.toContain("expiresIn");

	const collectionWithoutBreakpoints = new CollectionBuilder("posts", {
		mode: "multiple",
		details: {
			name: "Posts",
			singularName: "Post",
		},
		preview: { url: preview },
	});
	expect(
		collectionsFormatter.formatSingle({
			collection: collectionWithoutBreakpoints,
		}).preview,
	).toEqual({ breakpoints: [] });
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
				},
			],
		},
	});

	expect(collection.getData.workflow).toEqual({
		initial: "todo",
		stages: [
			{
				key: "todo",
				name: copy("admin:tests.workflow.todo.name", {
					defaultMessage: "To do",
				}),
				color: "grey",
				publishTargets: [],
			},
			{
				key: "done",
				name: copy("admin:tests.workflow.done.name", {
					defaultMessage: "Done",
				}),
				color: "green",
				publishTargets: ["production"],
			},
		],
	});
});

test("collection environment version mappings normalizes defaults", async () => {
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
		environments: [
			{
				key: "staging",
				name: copy("admin:tests.environments.staging.name", {
					defaultMessage: "Staging",
				}),
				collectionVersions: {
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
	});

	expect(collection.getData.environments).toEqual([
		{
			key: "staging",
			name: copy("admin:tests.environments.staging.name", {
				defaultMessage: "Staging",
			}),
			requires: [],
			collectionVersions: {
				blog: "signed-off",
			},
		},
		{
			key: "production",
			name: copy("admin:tests.environments.production.name", {
				defaultMessage: "Production",
			}),
			requires: ["staging"],
			collectionVersions: {},
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
