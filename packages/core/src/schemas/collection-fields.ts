import z from "zod";
import type { BooleanInt } from "../libs/db/types.js";

const FieldValueSchema = z
	.union([
		z.string(),
		z.number(),
		z.object({
			url: z.string().nullable(),
			target: z.string().nullable().optional(),
			label: z.string().nullable().optional(),
		}),
		z.null(),
		z.any(),
	])
	.optional();
export type FieldValueSchemaType = z.infer<typeof FieldValueSchema>;

export const FieldBaseSchema = z.object({
	key: z.string(),
	type: z.union([
		z.literal("text"),
		z.literal("wysiwyg"),
		z.literal("media"),
		z.literal("number"),
		z.literal("checkbox"),
		z.literal("select"),
		z.literal("textarea"),
		z.literal("json"),
		z.literal("colour"),
		z.literal("datetime"),
		z.literal("link"),
		z.literal("repeater"),
		z.literal("user"),
		z.literal("document"),
	]),
	translations: z.record(FieldValueSchema).optional(),
	value: FieldValueSchema.optional(),
});

export const FieldSchema: z.ZodType<FieldSchemaType> = FieldBaseSchema.extend({
	groups: z
		.lazy(() =>
			z.array(
				z.object({
					id: z.union([z.string(), z.number()]),
					order: z.number().optional(),
					open: z.union([z.literal(1), z.literal(0)]).optional(),
					fields: z.array(FieldSchema),
				}),
			),
		)
		.optional(),
});

export type FieldSchemaType = z.infer<typeof FieldBaseSchema> & {
	groups?: {
		id: string | number;
		order?: number;
		open?: BooleanInt;
		fields: FieldSchemaType[];
	}[];
};
export type FieldSchemaSimpleType = z.infer<typeof FieldBaseSchema> & {
	groups?: FieldSchemaType[][];
};

export const swaggerFieldObj = {
	type: "object",
	additionalProperties: true,
	properties: {
		key: {
			type: "string",
		},
		type: {
			type: "string",
		},
		translations: {
			type: "object",
			additionalProperties: true,
			nullable: true,
		},
		value: {},
		groups: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: true,
				properties: {
					id: {
						anyOf: [
							{
								type: "string",
							},
							{
								type: "number",
							},
						],
					},
					order: {
						type: "number",
						nullable: true,
					},
					fields: {
						type: "array",
						items: {
							type: "object",
							additionalProperties: true,
						},
					},
				},
			},
		},
	},
};
