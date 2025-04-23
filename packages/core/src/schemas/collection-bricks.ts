import z from "zod";
import { FieldSchema, type FieldSchemaType } from "./collection-fields.js";
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
	fields?: FieldSchemaType[];
}
