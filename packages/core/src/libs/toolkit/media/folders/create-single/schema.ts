import z from "zod";
import { controllerSchemas } from "../../../../../schemas/media-folders.js";
import { mediaActorSchema } from "../../schema.js";

export const inputSchema = z.strictObject({
	title: controllerSchemas.createSingle.body.shape.title,
	/** Folder to create it in. Defaults to the top level. */
	parentFolderId: z.number().int().positive().nullable().optional(),
	actor: mediaActorSchema,
});
