import z from "zod";
import type {
	TransferImportMode,
	TransferItemStatus,
} from "../types/response.js";
import type { ControllerSchema } from "../types/schema.js";

/** What an import does with entries already on the site: update them, skip them or import copies. */
export const transferImportModeSchema = z.enum([
	"upsert",
	"skip",
	"copy",
]) satisfies z.ZodType<TransferImportMode>;

/** How each entry in an import ended up. */
export const transferItemStatusSchema = z.enum([
	"created",
	"updated",
	"unchanged",
	"requested",
	"skipped",
	"failed",
]) satisfies z.ZodType<TransferItemStatus>;

const modeSchema = transferImportModeSchema.meta({
	description:
		"What to do with entries already on this site: update them, skip them or import copies.",
	example: "upsert",
});

const fileSchema = z.object({}).loose().meta({
	description: "An export file, without its bundled files.",
});

const itemResultSchema = z.object({
	resource: z.string(),
	uid: z.string(),
	label: z.string(),
	status: transferItemStatusSchema,
	id: z.string().nullable(),
	warnings: z.array(z.string()),
	error: z.object({}).loose().nullable(),
	retry: z.boolean(),
});

export const controllerSchemas = {
	exportFile: {
		body: z.object({
			select: z.record(z.string(), z.unknown()).meta({
				description: "What to export, by resource.",
				example: { documents: [{ collectionKey: "pages", ids: [1, 2] }] },
			}),
			linked: z.boolean().optional().meta({
				description:
					"Also export documents the selected records link to, one level deep.",
			}),
		}),
		query: { string: undefined, formatted: undefined },
		params: undefined,
		response: fileSchema,
	} satisfies ControllerSchema,
	checkImport: {
		body: z.object({ file: fileSchema, mode: modeSchema }),
		query: { string: undefined, formatted: undefined },
		params: undefined,
		response: z.object({
			sameSite: z.boolean(),
			resources: z.array(
				z.object({
					key: z.string(),
					label: z.object({ singular: z.string(), plural: z.string() }),
					reuse: z.boolean(),
				}),
			),
			items: z.array(itemResultSchema),
			copies: z.record(z.string(), z.record(z.string(), z.string())),
		}),
	} satisfies ControllerSchema,
	importEntry: {
		body: z.object({
			source: z.object({ instanceId: z.string() }),
			resource: z.string().min(1),
			entry: z.object({}).loose(),
			mode: modeSchema,
			pending: z
				.array(z.object({ resource: z.string(), uid: z.string() }))
				.meta({
					description:
						"Entries later in the same import, so links to them are held back instead of left out.",
				}),
			final: z.boolean().optional().meta({
				description:
					"The last attempt in an import, so links that can't be made are reported instead of held back.",
			}),
			upload: z
				.object({ key: z.string().min(1) })
				.optional()
				.meta({
					description:
						"The entry's bundled file, already uploaded through an upload session.",
				}),
		}),
		query: { string: undefined, formatted: undefined },
		params: undefined,
		response: itemResultSchema,
	} satisfies ControllerSchema,
};
