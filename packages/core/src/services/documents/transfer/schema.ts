import z from "zod";
import { transferEntrySchema } from "../../../libs/transfer/schema.js";

const fieldsSchema = z.record(z.string(), z.unknown());
const brickSchema = z.object({
	ref: z.string().min(1).max(128),
	key: z.string().min(1),
	fields: fieldsSchema,
});

export const documentEntrySchema = transferEntrySchema.extend({
	collectionKey: z.string().min(1),
	label: z.string(),
	/** Keys of fields the source site stores per locale, so values convert when this site's localization differs. */
	localized: z
		.object({
			fields: z.array(z.string()),
			bricks: z.record(z.string(), z.array(z.string())),
		})
		.optional(),
	data: z.object({
		fields: fieldsSchema,
		bricks: z.object({
			fixed: z.record(z.string(), fieldsSchema),
			builder: z.array(brickSchema),
			embedded: z.array(brickSchema),
		}),
	}),
});

export type DocumentEntry = z.infer<typeof documentEntrySchema>;

/** Documents to export by collection, as `<collectionKey>:<id>` IDs. */
export const documentSelectionSchema = z
	.array(
		z.strictObject({
			collectionKey: z.string().min(1),
			ids: z.array(z.number().int().positive()).min(1),
		}),
	)
	.transform((items) =>
		items.flatMap(({ collectionKey, ids }) =>
			ids.map((id) => `${collectionKey}:${id}`),
		),
	);
