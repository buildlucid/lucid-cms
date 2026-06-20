import { expect, test } from "vitest";
import { copy } from "../../../i18n/index.js";
import CollectionBuilder from "./index.js";
import CollectionConfigSchema from "./schema.js";

test("collection builder config passes schema validation", async () => {
	const collection = new CollectionBuilder("pages", {
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
		});

	const res = await CollectionConfigSchema.safeParseAsync(collection.config);
	expect(res.success).toBe(true);
});

test("collection workflow config validates stages, targets and palette", async () => {
	const validConfig = {
		key: "pages",
		mode: "multiple",
		details: {
			name: copy("admin:tests.collections.pages.name", {
				defaultMessage: "Pages",
			}),
			singularName: copy("admin:tests.collections.pages.singularName", {
				defaultMessage: "Page",
			}),
		},
		config: {
			workflow: {
				initial: "todo",
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
			environments: [
				{
					key: "production",
					name: copy("admin:tests.environments.production.name", {
						defaultMessage: "Production",
					}),
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
			config: {
				...validConfig.config,
				workflow: {
					initial: "missing",
					stages: validConfig.config.workflow.stages,
				},
			},
		}),
	).resolves.toMatchObject({
		success: false,
	});

	await expect(
		CollectionConfigSchema.safeParseAsync({
			...validConfig,
			config: {
				...validConfig.config,
				workflow: {
					stages: [
						{
							key: "todo",
							name: copy("admin:tests.workflow.todo.name", {
								defaultMessage: "To do",
							}),
						},
						{
							key: "todo",
							name: copy("admin:tests.workflow.duplicate.name", {
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
			config: {
				...validConfig.config,
				workflow: {
					stages: [
						{
							key: "todo",
							name: copy("admin:tests.workflow.todo.name", {
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
			config: {
				...validConfig.config,
				workflow: {
					stages: [
						{
							key: "done",
							name: copy("admin:tests.workflow.done.name", {
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

test("collection environment relation config passes schema validation", async () => {
	await expect(
		CollectionConfigSchema.safeParseAsync({
			key: "pages",
			mode: "multiple",
			details: {
				name: copy("admin:tests.collections.pages.name", {
					defaultMessage: "Pages",
				}),
				singularName: copy("admin:tests.collections.pages.singularName", {
					defaultMessage: "Page",
				}),
			},
			config: {
				environments: [
					{
						key: "staging",
						name: copy("admin:tests.environments.staging.name", {
							defaultMessage: "Staging",
						}),
						relations: {
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

test("collection environment requires config validates environment references", async () => {
	const validConfig = {
		key: "pages",
		mode: "multiple",
		details: {
			name: copy("admin:tests.collections.pages.name", {
				defaultMessage: "Pages",
			}),
			singularName: copy("admin:tests.collections.pages.singularName", {
				defaultMessage: "Page",
			}),
		},
		config: {
			environments: [
				{
					key: "staging",
					name: copy("admin:tests.environments.staging.name", {
						defaultMessage: "Staging",
					}),
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
	};

	await expect(
		CollectionConfigSchema.safeParseAsync(validConfig),
	).resolves.toMatchObject({
		success: true,
	});

	await expect(
		CollectionConfigSchema.safeParseAsync({
			...validConfig,
			config: {
				environments: [
					{
						key: "production",
						name: copy("admin:tests.environments.production.name", {
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
			config: {
				environments: [
					{
						key: "production",
						name: copy("admin:tests.environments.production.name", {
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
