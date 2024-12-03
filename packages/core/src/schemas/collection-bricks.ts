import z from "zod";
import { FieldSchema, swaggerFieldObj } from "./collection-fields.js";
import constants from "../constants/constants.js";
import type { BooleanInt } from "../libs/db/types.js";
import type { BrickTypes } from "../libs/builders/brick-builder/types.js";

export const BrickSchema = z.object({
	id: z.union([z.string(), z.number()]),
	key: z.string(),
	order: z.number(),
	type: z.union([z.literal("builder"), z.literal("fixed")]),
	open: z.union([z.literal(1), z.literal(0)]).optional(),
	fields: z.array(FieldSchema).optional(),
});
export interface BrickSchema {
	id: number | string;
	key?: string;
	order?: number;
	type: BrickTypes;
	open?: BooleanInt;
	fields?: z.infer<typeof FieldSchema>[];
}

export const swaggerBodyBricksObj = {
	type: "object",
	properties: {
		key: {
			type: "string",
		},
		order: {
			type: "number",
		},
		type: {
			type: "string",
			enum: Object.values(constants.brickTypes),
		},
		open: {
			type: "number",
			nullable: true,
		},
		fields: {
			type: "array",
			items: swaggerFieldObj,
		},
	},
};
