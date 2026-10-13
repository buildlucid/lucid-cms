import z from "zod";
import { mediaActorSchema } from "../schema.js";

export const inputSchema = z.strictObject({
	id: z.number().int().positive(),
	/** Permanently remove the file and record. Defaults to false. */
	hard: z.boolean().default(false),
	actor: mediaActorSchema,
});
