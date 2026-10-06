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
					total: z.number(),
					targets: z.array(
						z.object({
							key: z.string(),
							inSync: z.number(),
							outOfSync: z.number(),
							unreleased: z.number(),
						}),
					),
				}),
			),
			requests: requestOverviewResponseSchema,
		}),
	} satisfies ControllerSchema,
};
