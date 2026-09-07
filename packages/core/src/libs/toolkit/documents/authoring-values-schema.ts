import z from "zod";

/** Identifies who is making a document change. System writes have no user attribution. */
export const documentActorSchema = z.discriminatedUnion("kind", [
	z.strictObject({ kind: z.literal("system") }),
	z.strictObject({
		kind: z.literal("user"),
		userId: z.number().int().positive(),
	}),
]);

export const documentRefSchema = z.string().min(1).max(128);

export const documentEditTokenSchema = z
	.string()
	.min(1)
	.brand<"DocumentEditToken">();

export const documentFieldsSchema = z.record(z.string(), z.unknown());

export const documentGroupSchema = z.strictObject({
	/** Keep this reference when replacing an existing item. Omit it for a new item. */
	ref: documentRefSchema.optional(),
	fields: documentFieldsSchema,
});

export const documentBrickSchema = documentGroupSchema.extend({
	key: z.string().min(1),
});

export const documentDataSchema = z.strictObject({
	/** Field values keyed by field name. Omitted values are preserved on update. */
	fields: documentFieldsSchema.optional(),
	bricks: z
		.strictObject({
			/** Fixed brick fields keyed by brick name. Omitted bricks and fields are preserved. */
			fixed: z.record(z.string(), documentFieldsSchema).optional(),
			/** Replaces the ordered builder bricks. An empty array removes all builder bricks. */
			builder: z.array(documentBrickSchema).optional(),
			/** Replaces embedded bricks. References must match the references in rich text. */
			embedded: z.array(documentBrickSchema.required({ ref: true })).optional(),
		})
		.optional(),
});

export const documentPathSchema = z
	.array(
		z.union([
			z.string().min(1),
			z.strictObject({
				ref: documentRefSchema,
				key: z.string().min(1).optional(),
			}),
		]),
	)
	.min(1);

export const documentPatchSchema = z.discriminatedUnion("op", [
	z.strictObject({
		op: z.literal("set"),
		path: documentPathSchema,
		value: z.unknown(),
	}),
	z.strictObject({
		op: z.literal("insert"),
		path: documentPathSchema,
		value: z.unknown(),
		before: documentRefSchema.optional(),
	}),
	z.strictObject({ op: z.literal("remove"), path: documentPathSchema }),
	z.strictObject({
		op: z.literal("move"),
		path: documentPathSchema,
		before: documentRefSchema.optional(),
	}),
	z.strictObject({
		op: z.literal("connect"),
		path: documentPathSchema,
		values: z.array(z.unknown()).min(1),
	}),
	z.strictObject({
		op: z.literal("disconnect"),
		path: documentPathSchema,
		values: z.array(z.unknown()).min(1),
	}),
]);

/** Complete authoring values after defaults and nested references have been resolved. */
export const documentEditableDataSchema = z.strictObject({
	fields: documentFieldsSchema,
	bricks: z.strictObject({
		fixed: z.record(z.string(), documentFieldsSchema),
		builder: z.array(documentBrickSchema.required({ ref: true })),
		embedded: z.array(documentBrickSchema.required({ ref: true })),
	}),
});
