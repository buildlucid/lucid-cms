import { expect, test } from "vitest";
import { adminText } from "../../../i18n/admin-text.js";
import CollectionBuilder from "./index.js";
import CollectionConfigSchema from "./schema.js";

test("collection builder config passes schema validation", async () => {
	const collection = new CollectionBuilder("pages", {
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
		});

	const res = await CollectionConfigSchema.safeParseAsync(collection.config);
	expect(res.success).toBe(true);
});

test("collection workflow config validates stages, targets and palette", async () => {
	const validConfig = {
		key: "pages",
		mode: "multiple",
		details: {
			name: adminText("tests.collections.pages.name", { fallback: "Pages" }),
			singularName: adminText("tests.collections.pages.singularName", {
				fallback: "Page",
			}),
		},
		config: {
			workflow: {
				initial: "todo",
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
					},
				],
			},
			environments: [
				{
					key: "production",
					name: adminText("tests.environments.production.name", {
						fallback: "Production",
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
							name: adminText("tests.workflow.todo.name", {
								fallback: "To do",
							}),
						},
						{
							key: "todo",
							name: adminText("tests.workflow.duplicate.name", {
								fallback: "Duplicate",
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
							name: adminText("tests.workflow.todo.name", {
								fallback: "To do",
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
							name: adminText("tests.workflow.done.name", { fallback: "Done" }),
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
