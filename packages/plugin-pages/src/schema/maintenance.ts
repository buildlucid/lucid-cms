import { z } from "@lucidcms/core";
import type { RouteSchema } from "@lucidcms/core/types";

export const controllerSchemas = {
	rebuildPaths: {
		body: undefined,
		query: undefined,
		params: undefined,
		response: z.object({
			jobId: z.string().meta({
				description: "The queued job rebuilding the paths.",
				example: "0199b1c4-6f0a-7c9e-8d2b-3f4a5b6c7d8e",
			}),
		}),
	} satisfies RouteSchema,
	clearPathHistory: {
		body: undefined,
		query: undefined,
		params: undefined,
		response: z.object({
			jobId: z.string().meta({
				description: "The queued job clearing the path history.",
				example: "0199b1c4-6f0a-7c9e-8d2b-3f4a5b6c7d8e",
			}),
		}),
	} satisfies RouteSchema,
};
