import { z } from "@lucidcms/core";
import type { RouteSchema } from "@lucidcms/core/types";
import type { IndexNowStatus } from "../services/index-now/get-status.js";

export const controllerSchemas = {
	send: {
		body: undefined,
		query: undefined,
		params: undefined,
		response: z.object({
			jobId: z.string().meta({
				description: "The queued job sending the changed pages.",
				example: "0199b1c4-6f0a-7c9e-8d2b-3f4a5b6c7d8e",
			}),
		}),
	} satisfies RouteSchema,
	status: {
		body: undefined,
		query: undefined,
		params: undefined,
		response: z.object({
			pending: z.number().meta({
				description: "How many URLs are waiting to be sent.",
				example: 3,
			}),
			lastSend: z
				.object({
					sentAt: z.string().meta({
						description: "When IndexNow last accepted changed pages.",
						example: "2026-11-13T09:30:00.000Z",
					}),
					urlCount: z.number().meta({
						description: "How many URLs it accepted then.",
						example: 12,
					}),
				})
				.nullable()
				.meta({ description: "Null before the first send." }),
		}) satisfies z.ZodType<IndexNowStatus>,
	} satisfies RouteSchema,
};
