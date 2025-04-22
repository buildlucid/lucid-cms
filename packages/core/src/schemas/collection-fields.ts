import z from "zod";

export const FieldSchema = z.interface({
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
	"translations?": z.record(z.string(), z.any()),
	"value?": z.any(),

	get "groups?"() {
		return z
			.array(
				z.interface({
					ref: z.string(),
					order: z.number().optional(),
					open: z.boolean().optional(),
					get fields() {
						return z.array(FieldSchema);
					},
				}),
			)
			.optional();
	},
});
export type FieldSchemaType = z.infer<typeof FieldSchema>;

// export const swaggerFieldObj = {
// 	type: "object",
// 	additionalProperties: true,
// 	properties: {
// 		key: {
// 			type: "string",
// 		},
// 		type: {
// 			type: "string",
// 		},
// 		translations: {
// 			type: "object",
// 			additionalProperties: true,
// 			nullable: true,
// 		},
// 		value: {},
// 		groups: {
// 			type: "array",
// 			items: {
// 				type: "object",
// 				additionalProperties: true,
// 				properties: {
// 					ref: {
// 						type: "string",
// 					},
// 					order: {
// 						type: "number",
// 						nullable: true,
// 					},
// 					open: {
// 						type: "boolean",
// 						nullable: true,
// 					},
// 					fields: {
// 						type: "array",
// 						items: {
// 							type: "object",
// 							additionalProperties: true,
// 						},
// 					},
// 				},
// 			},
// 		},
// 	},
// };
