import z from "zod";
import { documentWriteSchema } from "../authoring-schema.js";

export const inputSchema = documentWriteSchema
	.extend({
		documentIds: z.array(z.number().int().positive()).min(1).max(100),
		/** Locales to translate into. Defaults to the request's locales, or every locale but the collection's default. */
		locales: z.array(z.string().min(1)).min(1).optional(),
		/** An open request whose proposals are translated instead. The documents must already be in it. */
		requestId: z.number().int().positive().optional(),
		/** Saves the translations straight to latest, without review. */
		direct: z.boolean().optional(),
		/** Replaces every translation, including people's. */
		overwrite: z.boolean().optional(),
		/** Instructions for this translation, eg. tone or terms. */
		note: z.string().trim().min(1).max(2_000).optional(),
	})
	.refine((input) => !(input.direct && input.requestId !== undefined), {
		message: "Translate into a request or directly, not both",
	});
