import z from "zod";
import type { ControllerSchema } from "../types.js";

export const controllerSchemas = {
	getOverview: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({}),
		response: z.object({
			collections: z.array(
				z.object({
					collectionKey: z.string(),
					environments: z.array(
						z.object({
							target: z.string(),
							unreleased: z.number(),
							outOfSync: z.number(),
							inSync: z.number(),
						}),
					),
				}),
			),
			releaseRequests: z.array(
				z.object({
					target: z.string(),
					pending: z.number(),
					scheduled: z.number(),
					failed: z.number(),
				}),
			),
		}),
	} satisfies ControllerSchema,
};
