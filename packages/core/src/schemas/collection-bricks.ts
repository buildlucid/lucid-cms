import z from "zod";
import { FieldSchema } from "./collection-fields.js";
import constants from "../constants/constants.js";
import type { BrickTypes } from "../libs/builders/brick-builder/types.js";

export const BrickSchema = z.object({
	ref: z.string(),
	key: z.string(),
	order: z.number(),
	type: z.union([z.literal("builder"), z.literal("fixed")]),
	open: z.boolean().optional(),
	fields: z.array(FieldSchema).optional(),
});
export interface BrickSchema {
	ref: string;
	key: string;
	order: number;
	type: BrickTypes;
	open?: boolean;
	fields?: z.infer<typeof FieldSchema>[];
}

// export const swaggerBodyBricksObj = {
// 	type: "object",
// 	properties: {
// 		ref: {
// 			type: "string",
// 		},
// 		key: {
// 			type: "string",
// 		},
// 		order: {
// 			type: "number",
// 		},
// 		type: {
// 			type: "string",
// 			enum: Object.values(constants.brickTypes),
// 		},
// 		open: {
// 			type: "boolean",
// 			nullable: true,
// 		},
// 		fields: {
// 			type: "array",
// 			items: swaggerFieldObj,
// 		},
// 	},
// };
