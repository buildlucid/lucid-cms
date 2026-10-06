import z from "zod";
import type { ControllerSchema } from "../exports/types.js";
import { requestOverviewResponseSchema } from "./requests.js";

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
			requests: requestOverviewResponseSchema,
		}),
	} satisfies ControllerSchema,
};
