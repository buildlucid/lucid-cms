import z from "zod";
import { transferImportModeSchema } from "../../../../schemas/transfer.js";
import { toolkitActorSchema } from "../../../permission/toolkit-actor.js";
import type { TransferFileReader } from "../../../transfer/types.js";

export const inputSchema = z.strictObject({
	/** Use a system actor for scripts, or a user actor to import only what that user can create and change. */
	actor: toolkitActorSchema,
	/** A parsed export file. */
	file: z.unknown(),
	/** Update what's already on this site (default), skip it, or import everything as copies. */
	mode: transferImportModeSchema.optional(),
	/** Reads bundled files by their path in the export, eg. `files/<uid>.webp`. Files that aren't bundled are downloaded from the source site. */
	files: z
		.custom<TransferFileReader>((value) => typeof value === "function")
		.optional(),
	/** Plans each entry's outcome without saving anything. */
	dryRun: z.boolean().optional(),
});
