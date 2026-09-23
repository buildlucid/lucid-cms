import z from "zod";
import constants from "../../../../constants/constants.js";
import { hookSchema } from "../../../config/definition-schemas.js";
import { adminCopyInputSchema } from "../../../i18n/index.js";

const environmentKeySchema = z
	.string()
	.min(1)
	.max(50)
	.regex(/^[a-z0-9-_]+$/, {
		message:
			"Publishing target key must contain only lowercase letters, numbers, hyphens and underscores",
	});

const groupKeySchema = z
	.string()
	.min(1)
	.max(50)
	.regex(/^[a-z0-9-_]+$/, {
		message:
			"Collection group key must contain only lowercase letters, numbers, hyphens and underscores",
	});

const previewBreakpointKeySchema = z
	.string()
	.min(1)
	.max(50)
	.regex(/^[a-z0-9-_]+$/, {
		message:
			"Preview breakpoint key must contain only lowercase letters, numbers, hyphens and underscores",
	});

const versionMapCollectionKeySchema = z
	.string()
	.min(1)
	.max(constants.db.maxBuilderKeyLength)
	.regex(/^[a-z0-9-_]+$/, {
		message:
			"Collection key must contain only lowercase letters, numbers, hyphens and underscores",
	})
	.refine((val) => !val.includes(constants.db.nameSeparator), {
		message: `Collection key cannot contain '${constants.db.nameSeparator}'`,
	});

const collectionLocalizationSchema = z.union([
	z.boolean(),
	z.strictObject({
		locales: z.array(z.string().trim().min(1)).min(1),
		defaultLocale: z.string().trim().min(1).optional(),
	}),
	z.strictObject({
		locales: z.never().optional(),
		defaultLocale: z.string().trim().min(1),
	}),
]);

const CollectionConfigSchema = z
	.strictObject({
		key: z
			.string()
			.min(1)
			.max(constants.db.maxBuilderKeyLength)
			.regex(/^[a-z0-9-_]+$/, {
				message:
					"Collection key must contain only lowercase letters, numbers, hyphens and underscores",
			})
			.refine((val) => !val.includes(constants.db.nameSeparator), {
				message: `Collection key cannot contain '${constants.db.nameSeparator}'`,
			}),
		mode: z.enum(["single", "multiple"]),
		group: z
			.union([
				groupKeySchema,
				z.strictObject({
					key: groupKeySchema,
					label: adminCopyInputSchema.optional(),
					order: z.number().optional(),
				}),
			])
			.optional(),
		details: z.strictObject({
			labels: z.strictObject({
				singular: adminCopyInputSchema,
				plural: adminCopyInputSchema,
			}),
			description: adminCopyInputSchema.optional(),
		}),
		locked: z.boolean().default(constants.collectionBuilder.locked).optional(),
		localized: collectionLocalizationSchema
			.default(constants.collectionBuilder.localized)
			.optional(),
		revisions: z
			.union([
				z.literal(true),
				z.strictObject({
					enabled: z.boolean(),
					retentionDays: z
						.union([z.number().int().positive(), z.literal(false)])
						.optional(),
				}),
			])
			.optional(),
		autoSave: z
			.boolean()
			.default(constants.collectionBuilder.autoSave)
			.optional(),
		orderable: z
			.boolean()
			.default(constants.collectionBuilder.orderable)
			.optional(),
		routing: z.strictObject({ field: z.string().trim().min(1) }).optional(),
		preview: z
			.union([
				z.boolean(),
				z.strictObject({
					enabled: z.boolean().optional(),
					url: z.function().optional(),
					expiresInSeconds: z
						.number()
						.int()
						.positive()
						.max(constants.collectionBuilder.previewMaxExpirationSeconds)
						.optional(),
					breakpoints: z
						.array(
							z.strictObject({
								key: previewBreakpointKeySchema,
								label: adminCopyInputSchema,
								width: z.number().int().min(280).max(2560),
							}),
						)
						.optional(),
				}),
			])
			.optional(),
		hooks: z.array(hookSchema).optional(),
		bricks: z
			.strictObject({
				fixed: z.array(z.unknown()).optional(),
				builder: z.array(z.unknown()).optional(),
				embedded: z.array(z.unknown()).optional(),
			})
			.optional(),
		publishing: z
			.strictObject({
				targets: z
					.array(
						z.strictObject({
							key: environmentKeySchema.refine(
								(val) =>
									!constants.collectionBuilder.protectedEnvironments.includes(
										val,
									),
								{
									message: `Publishing target key cannot be one of the protected publishing targets: ${constants.collectionBuilder.protectedEnvironments.join(", ")}`,
								},
							),
							label: adminCopyInputSchema,
							requires: z.array(environmentKeySchema).optional(),
							collectionVersions: z
								.record(versionMapCollectionKeySchema, environmentKeySchema)
								.optional(),
						}),
					)
					.optional(),
				review: z
					.strictObject({
						requiredFor: z
							.array(
								z
									.string()
									.min(1)
									.max(50)
									.regex(/^[a-z0-9-_]+$/),
							)
							.optional(),
						allowSelfApproval: z
							.boolean()
							.default(constants.collectionBuilder.publishing.allowSelfApproval)
							.optional(),
						comments: z
							.strictObject({
								request: z
									.enum(["required", "optional"])
									.default(
										constants.collectionBuilder.publishing.comments.request,
									)
									.optional(),
								decision: z
									.enum(["required", "optional"])
									.default(
										constants.collectionBuilder.publishing.comments.decision,
									)
									.optional(),
							})
							.optional(),
					})
					.optional(),
				workflow: z
					.strictObject({
						initial: z
							.string()
							.min(1)
							.max(50)
							.regex(/^[a-z0-9-_]+$/)
							.optional(),
						stages: z
							.array(
								z.strictObject({
									key: z
										.string()
										.min(1)
										.max(50)
										.regex(/^[a-z0-9-_]+$/),
									label: adminCopyInputSchema,
									color: z
										.enum(
											constants.collectionBuilder.publishing.workflow
												.stageColors,
										)
										.optional(),
									publishTargets: z
										.array(
											z
												.string()
												.min(1)
												.max(50)
												.regex(/^[a-z0-9-_]+$/),
										)
										.optional(),
								}),
							)
							.min(1),
					})
					.optional(),
				scheduling: z
					.boolean()
					.default(constants.collectionBuilder.scheduling)
					.optional(),
			})
			.optional(),
	})
	.superRefine((data, ctx) => {
		const environmentKeys = new Set(
			data.publishing?.targets?.map((environment) => environment.key) ?? [],
		);

		for (const [environmentIndex, environment] of (
			data.publishing?.targets ?? []
		).entries()) {
			for (const [targetIndex, target] of (
				environment.requires ?? []
			).entries()) {
				if (target === environment.key) {
					ctx.addIssue({
						code: "custom",
						path: [
							"publishing",
							"targets",
							environmentIndex,
							"requires",
							targetIndex,
						],
						message: `Publishing target "${environment.key}" cannot require itself`,
					});
					continue;
				}

				if (environmentKeys.has(target)) continue;
				ctx.addIssue({
					code: "custom",
					path: [
						"publishing",
						"targets",
						environmentIndex,
						"requires",
						targetIndex,
					],
					message: `Publishing target requires target "${target}" must reference a configured publishing target`,
				});
			}
		}
		const review = data.publishing?.review;
		for (const [targetIndex, target] of (review?.requiredFor ?? []).entries()) {
			if (environmentKeys.has(target)) continue;
			ctx.addIssue({
				code: "custom",
				path: ["publishing", "review", "requiredFor", targetIndex],
				message: `Review requiredFor target "${target}" must reference a configured publishing target`,
			});
		}

		const breakpointKeys =
			typeof data.preview === "boolean"
				? []
				: (data.preview?.breakpoints?.map((breakpoint) => breakpoint.key) ??
					[]);
		const duplicateBreakpointKeys = breakpointKeys.filter(
			(key, index) => breakpointKeys.indexOf(key) !== index,
		);
		if (duplicateBreakpointKeys.length > 0) {
			ctx.addIssue({
				code: "custom",
				path: ["preview", "breakpoints"],
				message: `Preview breakpoint keys must be unique: ${Array.from(new Set(duplicateBreakpointKeys)).join(", ")}`,
			});
		}
		const workflow = data.publishing?.workflow;
		if (!workflow) return;

		const stageKeys = workflow.stages.map((stage) => stage.key);
		const duplicateStageKeys = stageKeys.filter(
			(key, index) => stageKeys.indexOf(key) !== index,
		);
		if (duplicateStageKeys.length > 0) {
			ctx.addIssue({
				code: "custom",
				path: ["publishing", "workflow", "stages"],
				message: `Workflow stage keys must be unique: ${Array.from(new Set(duplicateStageKeys)).join(", ")}`,
			});
		}

		if (workflow.initial && !stageKeys.includes(workflow.initial)) {
			ctx.addIssue({
				code: "custom",
				path: ["publishing", "workflow", "initial"],
				message:
					"Workflow initial stage must reference one of the configured stages",
			});
		}

		for (const [stageIndex, stage] of workflow.stages.entries()) {
			for (const [targetIndex, target] of (
				stage.publishTargets ?? []
			).entries()) {
				if (environmentKeys.has(target)) continue;
				ctx.addIssue({
					code: "custom",
					path: [
						"publishing",
						"workflow",
						"stages",
						stageIndex,
						"publishTargets",
						targetIndex,
					],
					message: `Workflow publishTargets target "${target}" must reference a configured publishing target`,
				});
			}
		}
	});

export default CollectionConfigSchema;
