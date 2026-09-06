import { expect, test } from "vitest";
import { copy } from "../../../i18n/index.js";
import CollectionBuilder from "./index.js";
import CollectionConfigSchema from "./schema.js";

test("collection builder options passes schema validation", async () => {
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
		});

	const res = await CollectionConfigSchema.safeParseAsync(collection.config);
	expect(res.success).toBe(true);
});

test("collection localization accepts scoped locales or a default override", async () => {
	const config = {
		key: "articles",
		mode: "multiple",
		details: {
			labels: {
				singular: "Article",
				plural: "Articles",
			},
		},
	};

	await expect(
		CollectionConfigSchema.safeParseAsync({
			...config,
			localized: { locales: ["fr", "de"], defaultLocale: "fr" },
		}),
	).resolves.toMatchObject({ success: true });
	await expect(
		CollectionConfigSchema.safeParseAsync({
			...config,
			localized: { defaultLocale: "fr" },
		}),
	).resolves.toMatchObject({ success: true });
	await expect(
		CollectionConfigSchema.safeParseAsync({
			...config,
			localized: {},
		}),
	).resolves.toMatchObject({ success: false });
	await expect(
		CollectionConfigSchema.safeParseAsync({
			...config,
			localized: { locales: [] },
		}),
	).resolves.toMatchObject({ success: false });
});

test("collection preview breakpoints validate labels, keys and widths", async () => {
	const config = {
		key: "pages",
		mode: "multiple",
		details: {
			labels: {
				singular: "Page",
				plural: "Pages",
			},
		},
		preview: {
			enabled: true,
			url: () => "https://example.com",
			breakpoints: [
				{
					key: "mobile",
					label: "Mobile",
					width: 390,
				},
				{
					key: "large-screen",
					label: copy("admin:tests.preview.largeScreen", {
						defaultMessage: "Large screen",
					}),
					width: 1440,
				},
			],
		},
	};

	await expect(
		CollectionConfigSchema.safeParseAsync(config),
	).resolves.toMatchObject({
		success: true,
	});

	await expect(
		CollectionConfigSchema.safeParseAsync({ ...config, preview: true }),
	).resolves.toMatchObject({ success: true });
	await expect(
		CollectionConfigSchema.safeParseAsync({
			...config,
			preview: { enabled: false, breakpoints: config.preview.breakpoints },
		}),
	).resolves.toMatchObject({ success: true });
	await expect(
		CollectionConfigSchema.safeParseAsync({
			...config,
			preview: { breakpoints: config.preview.breakpoints },
		}),
	).resolves.toMatchObject({ success: true });
	for (const width of [279, 2561, 390.5]) {
		await expect(
			CollectionConfigSchema.safeParseAsync({
				...config,
				preview: {
					...config.preview,
					breakpoints: [{ key: "mobile", label: "Mobile", width }],
				},
			}),
		).resolves.toMatchObject({ success: false });
	}

	await expect(
		CollectionConfigSchema.safeParseAsync({
			...config,
			preview: {
				...config.preview,
				breakpoints: [{ key: "Mobile", label: "Mobile", width: 390 }],
			},
		}),
	).resolves.toMatchObject({ success: false });

	await expect(
		CollectionConfigSchema.safeParseAsync({
			...config,
			preview: {
				...config.preview,
				breakpoints: [
					{ key: "mobile", label: "Mobile", width: 390 },
					{ key: "mobile", label: "Compact", width: 480 },
				],
			},
		}),
	).resolves.toMatchObject({ success: false });
});

test("collection workflow features validates stages, targets and palette", async () => {
	const validConfig = {
		key: "pages",
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
				initial: "todo",
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
	};

	await expect(
		CollectionConfigSchema.safeParseAsync(validConfig),
	).resolves.toMatchObject({
		success: true,
	});

	await expect(
		CollectionConfigSchema.safeParseAsync({
			...validConfig,
			publishing: {
				workflow: {
					initial: "missing",
					stages: validConfig.publishing.workflow.stages,
				},
			},
		}),
	).resolves.toMatchObject({
		success: false,
	});

	await expect(
		CollectionConfigSchema.safeParseAsync({
			...validConfig,
			publishing: {
				workflow: {
					stages: [
						{
							key: "todo",
							label: copy("admin:tests.workflow.todo.name", {
								defaultMessage: "To do",
							}),
						},
						{
							key: "todo",
							label: copy("admin:tests.workflow.duplicate.name", {
								defaultMessage: "Duplicate",
							}),
						},
					],
				},
			},
		}),
	).resolves.toMatchObject({
		success: false,
	});

	await expect(
		CollectionConfigSchema.safeParseAsync({
			...validConfig,
			publishing: {
				workflow: {
					stages: [
						{
							key: "todo",
							label: copy("admin:tests.workflow.todo.name", {
								defaultMessage: "To do",
							}),
							color: "orange",
						},
					],
				},
			},
		}),
	).resolves.toMatchObject({
		success: false,
	});

	await expect(
		CollectionConfigSchema.safeParseAsync({
			...validConfig,
			publishing: {
				workflow: {
					stages: [
						{
							key: "done",
							label: copy("admin:tests.workflow.done.name", {
								defaultMessage: "Done",
							}),
							publishTargets: ["missing"],
						},
					],
				},
			},
		}),
	).resolves.toMatchObject({
		success: false,
	});
});

test("collection group config validates shorthand and named groups", async () => {
	await expect(
		CollectionConfigSchema.safeParseAsync({
			key: "pages",
			mode: "multiple",
			group: "content",
			details: {
				labels: {
					singular: "Page",
					plural: "Pages",
				},
			},
		}),
	).resolves.toMatchObject({
		success: true,
	});

	await expect(
		CollectionConfigSchema.safeParseAsync({
			key: "blogs",
			mode: "multiple",
			group: {
				key: "content",
				label: copy("admin:tests.groups.content.name", {
					defaultMessage: "Content",
				}),
				order: 10,
			},
			details: {
				labels: {
					singular: "Blog",
					plural: "Blogs",
				},
			},
		}),
	).resolves.toMatchObject({
		success: true,
	});

	await expect(
		CollectionConfigSchema.safeParseAsync({
			key: "pages",
			mode: "multiple",
			group: "",
			details: {
				labels: {
					singular: "Page",
					plural: "Pages",
				},
			},
		}),
	).resolves.toMatchObject({
		success: false,
	});

	await expect(
		CollectionConfigSchema.safeParseAsync({
			key: "pages",
			mode: "multiple",
			group: "Content",
			details: {
				labels: {
					singular: "Page",
					plural: "Pages",
				},
			},
		}),
	).resolves.toMatchObject({
		success: false,
	});

	await expect(
		CollectionConfigSchema.safeParseAsync({
			key: "pages",
			mode: "multiple",
			group: {
				key: "content",
				order: "first",
			},
			details: {
				labels: {
					singular: "Page",
					plural: "Pages",
				},
			},
		}),
	).resolves.toMatchObject({
		success: false,
	});
});

test("collection environment version mappings passes schema validation", async () => {
	await expect(
		CollectionConfigSchema.safeParseAsync({
			key: "pages",
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
							settings: "latest",
						},
					},
				],
			},
		}),
	).resolves.toMatchObject({
		success: true,
	});
});

test("collection environment requires features validates environment references", async () => {
	const validConfig = {
		key: "pages",
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
	};

	await expect(
		CollectionConfigSchema.safeParseAsync(validConfig),
	).resolves.toMatchObject({
		success: true,
	});

	await expect(
		CollectionConfigSchema.safeParseAsync({
			...validConfig,
			publishing: {
				targets: [
					{
						key: "production",
						label: copy("admin:tests.environments.production.name", {
							defaultMessage: "Production",
						}),
						requires: ["staging"],
					},
				],
			},
		}),
	).resolves.toMatchObject({
		success: false,
	});

	await expect(
		CollectionConfigSchema.safeParseAsync({
			...validConfig,
			publishing: {
				targets: [
					{
						key: "production",
						label: copy("admin:tests.environments.production.name", {
							defaultMessage: "Production",
						}),
						requires: ["production"],
					},
				],
			},
		}),
	).resolves.toMatchObject({
		success: false,
	});
});
