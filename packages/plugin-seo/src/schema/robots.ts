import { z } from "@lucidcms/core";
import type { RouteSchema } from "@lucidcms/core/types";
import type { RobotsReadInput } from "../types.js";
import { originSchema } from "./origin.js";

/** Input for reading robots.txt. */
export const robotsReadInputSchema = z.object({
	origin: originSchema,
}) satisfies z.ZodType<RobotsReadInput>;

export const controllerSchemas = {
	text: {
		body: undefined,
		params: undefined,
		query: robotsReadInputSchema,
		response: undefined,
	} satisfies RouteSchema,
};
