import z from "zod";
import { BrickSchema } from "./collection-bricks.js";
import { FieldSchema } from "./collection-fields.js";

export default {
	createSingle: {
		body: z.object({
			publish: z.boolean(),
			bricks: z.array(BrickSchema).optional(),
			fields: z.array(FieldSchema).optional(),
		}),
		query: undefined,
		params: z.object({
			collectionKey: z.string(),
		}),
	},
	updateSingle: {
		body: z.object({
			publish: z.boolean(),
			bricks: z.array(BrickSchema).optional(),
			fields: z.array(FieldSchema).optional(),
		}),
		query: undefined,
		params: z.object({
			id: z.string(),
			collectionKey: z.string(),
		}),
	},
	deleteSingle: {
		body: undefined,
		query: undefined,
		params: z.object({
			collectionKey: z.string(),
			id: z.string(),
		}),
	},
	deleteMultiple: {
		body: z.object({
			ids: z.array(z.number()),
		}),
		query: undefined,
		params: z.object({
			collectionKey: z.string(),
		}),
	},
};
