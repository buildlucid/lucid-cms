import { expect, test } from "vitest";
import CollectionBuilder from "./index.js";
import CollectionConfigSchema from "./schema.js";

test("collection builder config passes schema validation", async () => {
	const collection = new CollectionBuilder("pages", {
		mode: "multiple",
		details: {
			name: "Pages",
			singularName: "Page",
			summary: "Pages are used to create static content on your website.",
		},
		config: {
			useTranslations: true,
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
		});

	const res = await CollectionConfigSchema.safeParseAsync(collection.config);
	expect(res.success).toBe(true);
});

test("collection workflow config validates stages, targets and palette", async () => {
	const validConfig = {
		key: "pages",
		mode: "multiple",
		details: {
			name: "Pages",
			singularName: "Page",
		},
		config: {
			publishing: {
				workflow: {
					initial: "todo",
					stages: [
						{
							key: "todo",
							name: "To do",
						},
						{
							key: "done",
							name: { en: "Done" },
							color: "green",
							canPublish: ["production"],
						},
					],
				},
			},
			environments: [
				{
					key: "production",
					name: "Production",
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
				publishing: {
					workflow: {
						initial: "missing",
						stages: validConfig.config.publishing.workflow.stages,
					},
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
				publishing: {
					workflow: {
						stages: [
							{ key: "todo", name: "To do" },
							{ key: "todo", name: "Duplicate" },
						],
					},
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
				publishing: {
					workflow: {
						stages: [
							{
								key: "todo",
								name: "To do",
								color: "orange",
							},
						],
					},
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
				publishing: {
					workflow: {
						stages: [
							{
								key: "done",
								name: "Done",
								canPublish: ["missing"],
							},
						],
					},
				},
			},
		}),
	).resolves.toMatchObject({
		success: false,
	});
});
