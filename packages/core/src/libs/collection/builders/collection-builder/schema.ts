import z from "zod";
import constants from "../../../../constants/constants.js";
import { adminCopyInputSchema } from "../../../i18n/index.js";

const environmentKeySchema = z
	.string()
	.min(1)
	.max(50)
	.regex(/^[a-z0-9-_]+$/, {
		message:
			"Environment key must contain only lowercase letters, numbers, hyphens and underscores",
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

const relationCollectionKeySchema = z
	.string()
	.min(1)
	.max(constants.db.maxBuilderKeyLength)
	.refine((val) => !val.includes(constants.db.nameSeparator), {
		message: `Collection key cannot contain '${constants.db.nameSeparator}'`,
	});

const CollectionConfigSchema = z
	.object({
		key: z
			.string()
			.max(constants.db.maxBuilderKeyLength)
			.refine((val) => !val.includes(constants.db.nameSeparator), {
				message: `Collection key cannot contain '${constants.db.nameSeparator}'`,
			}),
		mode: z.enum(["single", "multiple"]),
		group: z
			.union([
				groupKeySchema,
				z.object({
					key: groupKeySchema,
					name: adminCopyInputSchema.optional(),
					order: z.number().optional(),
				}),
			])
			.optional(),
		tenants: z.array(z.string().min(1)).optional(),
		details: z.object({
			name: adminCopyInputSchema,
			singularName: adminCopyInputSchema,
			summary: adminCopyInputSchema.optional(),
		}),
		permissions: z
			.object({
				read: z.string().optional(),
				create: z.string().optional(),
				update: z.string().optional(),
				delete: z.string().optional(),
				restore: z.string().optional(),
				publish: z.string().optional(),
				review: z.string().optional(),
			})
			.optional(),
		locked: z.boolean().default(constants.collectionBuilder.locked).optional(),
		localized: z
			.boolean()
			.default(constants.collectionBuilder.localized)
			.optional(),
		revisions: z
			.boolean()
			.default(constants.collectionBuilder.revisions)
			.optional(),
		autoSave: z
			.boolean()
			.default(constants.collectionBuilder.autoSave)
			.optional(),
		scheduling: z
			.boolean()
			.default(constants.collectionBuilder.scheduling)
			.optional(),
		orderable: z
			.boolean()
			.default(constants.collectionBuilder.orderable)
			.optional(),
		review: z
			.object({
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
					.object({
						request: z
							.enum(["required", "optional"])
							.default(constants.collectionBuilder.publishing.comments.request)
							.optional(),
						decision: z
							.enum(["required", "optional"])
							.default(constants.collectionBuilder.publishing.comments.decision)
							.optional(),
					})
					.optional(),
			})
			.optional(),
		workflow: z
			.object({
				initial: z
					.string()
					.min(1)
					.max(50)
					.regex(/^[a-z0-9-_]+$/)
					.optional(),
				stages: z
					.array(
						z.object({
							key: z
								.string()
								.min(1)
								.max(50)
								.regex(/^[a-z0-9-_]+$/),
							name: adminCopyInputSchema,
							color: z
								.enum(
									constants.collectionBuilder.publishing.workflow.stageColors,
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
							permissions: z
								.object({
									moveTo: z.string().optional(),
									moveFrom: z.string().optional(),
								})
								.optional(),
						}),
					)
					.min(1),
			})
			.optional(),
		environments: z
			.array(
				z.object({
					key: environmentKeySchema.refine(
						(val) =>
							!constants.collectionBuilder.protectedEnvironments.includes(val),
						{
							message: `Environment key cannot be one of the protected environments: ${constants.collectionBuilder.protectedEnvironments.join(", ")}`,
						},
					),
					name: adminCopyInputSchema,
					requires: z.array(environmentKeySchema).optional(),
					permissions: z
						.object({
							publish: z.string().optional(),
							review: z.string().optional(),
						})
						.optional(),
					relations: z
						.record(relationCollectionKeySchema, environmentKeySchema)
						.optional(),
				}),
			)
			.optional(),
		revisionRetentionDays: z
			.union([z.number().int().positive(), z.literal(false)])
			.default(constants.collectionBuilder.revisionRetentionDays)
			.optional(),
		preview: z
			.object({
				url: z.function(),
				expiresIn: z
					.number()
					.int()
					.positive()
					.max(constants.collectionBuilder.previewMaxExpirationSeconds)
					.optional(),
				breakpoints: z
					.array(
						z.object({
							key: previewBreakpointKeySchema,
							label: adminCopyInputSchema,
							width: z.number().int().min(280).max(2560),
						}),
					)
					.optional(),
			})
			.optional(),
		hooks: z
			.array(
				z.object({
					service: z.string(),
					event: z.string(),
					priority: z.number().optional(),
					handler: z.unknown(),
				}),
			)
			.optional(),
		bricks: z
			.object({
				fixed: z.array(z.unknown()).optional(),
				builder: z.array(z.unknown()).optional(),
			})
			.optional(),
	})
	.superRefine((data, ctx) => {
		const environmentKeys = new Set(
			data.environments?.map((environment) => environment.key) ?? [],
		);

		for (const [environmentIndex, environment] of (
			data.environments ?? []
		).entries()) {
			for (const [targetIndex, target] of (
				environment.requires ?? []
			).entries()) {
				if (target === environment.key) {
					ctx.addIssue({
						code: "custom",
						path: ["environments", environmentIndex, "requires", targetIndex],
						message: `Environment "${environment.key}" cannot require itself`,
					});
					continue;
				}

				if (environmentKeys.has(target)) continue;
				ctx.addIssue({
					code: "custom",
					path: ["environments", environmentIndex, "requires", targetIndex],
					message: `Environment requires target "${target}" must reference a configured environment`,
				});
			}
		}

		const review = data.review;
		for (const [targetIndex, target] of (review?.requiredFor ?? []).entries()) {
			if (environmentKeys.has(target)) continue;
			ctx.addIssue({
				code: "custom",
				path: ["review", "requiredFor", targetIndex],
				message: `Review requiredFor target "${target}" must reference a configured environment`,
			});
		}

		const breakpointKeys =
			data.preview?.breakpoints?.map((breakpoint) => breakpoint.key) ?? [];
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

		const workflow = data.workflow;
		if (!workflow) return;

		const stageKeys = workflow.stages.map((stage) => stage.key);
		const duplicateStageKeys = stageKeys.filter(
			(key, index) => stageKeys.indexOf(key) !== index,
		);
		if (duplicateStageKeys.length > 0) {
			ctx.addIssue({
				code: "custom",
				path: ["workflow", "stages"],
				message: `Workflow stage keys must be unique: ${Array.from(new Set(duplicateStageKeys)).join(", ")}`,
			});
		}

		if (workflow.initial && !stageKeys.includes(workflow.initial)) {
			ctx.addIssue({
				code: "custom",
				path: ["workflow", "initial"],
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
						"workflow",
						"stages",
						stageIndex,
						"publishTargets",
						targetIndex,
					],
					message: `Workflow publishTargets target "${target}" must reference a configured environment`,
				});
			}
		}
	});

export default CollectionConfigSchema;
