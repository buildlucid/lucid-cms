import z from "zod";
import type { ControllerSchema } from "../types.js";
import { richTextJSONSchema } from "./shared/rich-text.js";

export const controllerSchemas = {
	createSingle: {
		body: z.object({
			target: z.string().trim(),
			comment: richTextJSONSchema.optional(),
			assigneeIds: z.array(z.number()).optional(),
			autoAccept: z.boolean().optional(),
			scheduledAt: z.string().trim().nullable().optional(),
			scheduledTimezone: z.string().trim().nullable().optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			collectionKey: z.string().trim(),
			id: z.string().trim(),
		}),
		response: undefined,
	} satisfies ControllerSchema,
};
