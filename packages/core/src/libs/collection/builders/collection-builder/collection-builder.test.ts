import { expect, test } from "vitest";
import collectionsFormatter from "../../../formatters/collections.js";
import { copy } from "../../../i18n/index.js";
import { getFieldBuilderState } from "../field-builder/index.js";
import CollectionBuilder from "./index.js";
import CollectionSchema from "./schema.js";

test("resolves revision settings independently from enablement", () => {
	const options = {
		mode: "multiple" as const,
		details: { labels: { singular: "Page", plural: "Pages" } },
	};
	for (const [revisions, expected] of [
		[undefined, { enabled: false, retentionDays: 30 }],
		[true, { enabled: true, retentionDays: 30 }],
		[{ enabled: true }, { enabled: true, retentionDays: 30 }],
		[
			{ enabled: false, retentionDays: 7 },
			{ enabled: false, retentionDays: 7 },
		],
		[
			{ enabled: true, retentionDays: false },
			{ enabled: true, retentionDays: false },
		],
	] as const) {
		const collection = new CollectionBuilder("pages", {
			...options,
			revisions,
		});
		expect(
			CollectionSchema.safeParse({ key: "pages", ...options, revisions })
				.success,
		).toBe(true);
		expect(collection.getData.revisions).toEqual(expected);
	}
	for (const revisions of [false, {}, { retentionDays: 7 }]) {
		expect(
			CollectionSchema.safeParse({ key: "pages", ...options, revisions })
				.success,
		).toBe(false);
	}
});

test("formats the resolved collection locale contract", () => {
	const collection = new CollectionBuilder("articles", {
		mode: "multiple",
		details: {
			labels: {
				singular: "Article",
				plural: "Articles",
			},
		},
		localized: { locales: ["fr", "de"], defaultLocale: "de" },
	});

	expect(
		collectionsFormatter.formatSingle({
			collection,
			localization: {
				locales: [
					{ label: "English", code: "en" },
					{ label: "French", code: "fr" },
					{ label: "German", code: "de" },
				],
				defaultLocale: "en",
			},
		}).localized,
	).toEqual({ locales: ["fr", "de"], defaultLocale: "de" });
});

test("collection options are correct along with field includes and filters", async () => {
	const pagesCollection = new CollectionBuilder("pages", {
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
			description: copy("admin:tests.collections.pages.summary", {
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
	expect(getFieldBuilderState(pagesCollection).fields.size).toBe(16);
	expect(pagesCollection.getData).toEqual({
		key: "pages",
		mode: "multiple",
		group: null,
		details: {
			labels: {
				singular: copy("admin:tests.collections.pages.singularName", {
					defaultMessage: "Page",
				}),
				plural: copy("admin:tests.collections.pages.name", {
					defaultMessage: "Pages",
				}),
			},
			description: copy("admin:tests.collections.pages.summary", {
				defaultMessage:
					"Pages are used to create static content on your website.",
			}),
		},
		locked: false,
		revisions: { enabled: false, retentionDays: 30 },
		localized: true,
		autoSave: false,
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
		routing: null,
		preview: null,
		publishing: {
			targets: [],
			scheduling: false,
		},
	});
});

test("collection preview configuration exposes normalized breakpoints without private resolver data", () => {
	const preview = async () => new URL("https://example.com/page");
	const collection = new CollectionBuilder("pages", {
		mode: "multiple",
		details: {
			labels: {
				singular: "Page",
				plural: "Pages",
			},
		},
		preview: {
			enabled: true,
			url: preview,
			expiresInSeconds: 120,
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
	expect(collection.resolvedPreviewConfig?.url).toBe(preview);
	expect(collection.resolvedPreviewConfig?.expiresInSeconds).toBe(120);
	const adminCollection = collectionsFormatter.formatSingle({
		collection,
		localization: {
			locales: [{ label: "English", code: "en" }],
			defaultLocale: "en",
		},
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
			labels: {
				singular: "Post",
				plural: "Posts",
			},
		},
		preview: { enabled: true, url: preview },
	});
	expect(
		collectionsFormatter.formatSingle({
			collection: collectionWithoutBreakpoints,
			localization: {
				locales: [{ label: "English", code: "en" }],
				defaultLocale: "en",
			},
		}).preview,
	).toEqual({ breakpoints: [] });

	const shorthandCollection = new CollectionBuilder("shorthand", {
		mode: "multiple",
		details: {
			labels: {
				singular: "Shorthand page",
				plural: "Shorthand pages",
			},
		},
		preview: true,
	});
	expect(shorthandCollection.resolvedPreviewConfig).toEqual({ enabled: true });
	expect(shorthandCollection.getData.preview).toEqual({ breakpoints: [] });

	const disabledCollection = new CollectionBuilder("disabled", {
		mode: "multiple",
		details: {
			labels: {
				singular: "Disabled page",
				plural: "Disabled pages",
			},
		},
		preview: {
			enabled: false,
			url: preview,
			breakpoints: [{ key: "mobile", label: "Mobile", width: 390 }],
		},
	});
	expect(disabledCollection.config.preview).toMatchObject({
		enabled: false,
		url: preview,
		breakpoints: [{ key: "mobile", label: "Mobile", width: 390 }],
	});
	expect(disabledCollection.getData.preview).toBeNull();
});

test("collection workflow features normalizes defaults", async () => {
	const collection = new CollectionBuilder("pages", {
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
		publishing: {
			targets: [
				{
					key: "production",
					label: copy("admin:tests.environments.production.name", {
						defaultMessage: "Production",
					}),
				},
			],
			workflow: {
				stages: [
					{
						key: "todo",
						label: copy("admin:tests.workflow.todo.name", {
							defaultMessage: "To do",
						}),
					},
					{
						key: "done",
						label: copy("admin:tests.workflow.done.name", {
							defaultMessage: "Done",
						}),
						color: "green",
						publishTargets: ["production"],
					},
				],
			},
		},
	});
	expect(collection.getData.publishing.workflow).toEqual({
		initial: "todo",
		stages: [
			{
				key: "todo",
				label: copy("admin:tests.workflow.todo.name", {
					defaultMessage: "To do",
				}),
				color: "grey",
				publishTargets: [],
			},
			{
				key: "done",
				label: copy("admin:tests.workflow.done.name", {
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
			labels: {
				singular: copy("admin:tests.collections.pages.singularName", {
					defaultMessage: "Page",
				}),
				plural: copy("admin:tests.collections.pages.name", {
					defaultMessage: "Pages",
				}),
			},
		},
		publishing: {
			targets: [
				{
					key: "staging",
					label: copy("admin:tests.environments.staging.name", {
						defaultMessage: "Staging",
					}),
					collectionVersions: {
						blog: "signed-off",
					},
				},
				{
					key: "production",
					label: copy("admin:tests.environments.production.name", {
						defaultMessage: "Production",
					}),
					requires: ["staging"],
				},
			],
		},
	});
	expect(collection.getData.publishing.targets).toEqual([
		{
			key: "staging",
			label: copy("admin:tests.environments.staging.name", {
				defaultMessage: "Staging",
			}),
			requires: [],
			collectionVersions: {
				blog: "signed-off",
			},
		},
		{
			key: "production",
			label: copy("admin:tests.environments.production.name", {
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
			labels: {
				singular: "Page",
				plural: "Pages",
			},
		},
	});

	expect(shorthandCollection.getData.group).toEqual({
		key: "content",
		label: null,
		order: null,
	});

	const namedCollection = new CollectionBuilder("blogs", {
		mode: "multiple",
		group: {
			key: "content",
			label: "Content",
			order: 10,
		},
		details: {
			labels: {
				singular: "Blog",
				plural: "Blogs",
			},
		},
	});

	expect(namedCollection.getData.group).toEqual({
		key: "content",
		label: { type: "lucid.literal", value: "Content" },
		order: 10,
	});
});

test("plain string copy on details and fields is normalised to literal copy", () => {
	const collection = new CollectionBuilder("snippets", {
		mode: "multiple",
		details: {
			labels: {
				singular: "Snippet",
				plural: "Snippets",
			},
			description: "Reusable content snippets.",
		},
	}).addText("title", {
		details: {
			label: "Title",
			placeholder: "Enter a title",
		},
	});

	expect(collection.getData.details).toEqual({
		labels: {
			singular: { type: "lucid.literal", value: "Snippet" },
			plural: { type: "lucid.literal", value: "Snippets" },
		},
		description: { type: "lucid.literal", value: "Reusable content snippets." },
	});

	const titleField = collection.fieldTree.find(
		(field) => field.key === "title",
	);
	expect(titleField?.details).toMatchObject({
		label: { type: "lucid.literal", value: "Title" },
		placeholder: { type: "lucid.literal", value: "Enter a title" },
	});
});
