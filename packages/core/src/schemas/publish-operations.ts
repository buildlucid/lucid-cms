import z from "zod";
import type { ControllerSchema } from "../types.js";

export const controllerSchemas = {
	createSingle: {
		body: z.object({
			target: z.string().trim(),
			comment: z.string().trim().optional(),
			assigneeIds: z.array(z.number()).optional(),
			autoAccept: z.boolean().optional(),
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
