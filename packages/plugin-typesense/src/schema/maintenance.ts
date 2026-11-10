import { z } from "@lucidcms/core";
import type { RouteSchema } from "@lucidcms/core/types";
import type { TypesenseStatus } from "../toolkit/get-status/index.js";

const statusSchema = z.object({
	index: z.string().meta({ description: "The index key.", example: "pages" }),
	alias: z
		.string()
		.meta({ description: "The Typesense alias.", example: "pages" }),
	activeCollection: z.string().nullable().meta({
		description: "The Typesense collection the alias points to.",
		example: "pages_1788900000000",
	}),
	pending: z
		.number()
		.meta({ description: "Changes waiting to be indexed.", example: 0 }),
	sources: z.array(z.object({ key: z.string(), pending: z.number() })),
	rebuild: z
		.object({
			id: z.string(),
			status: z.enum(["pending", "complete"]),
			processed: z.number(),
			requestedAt: z.string().nullable(),
			completedAt: z.string().nullable(),
		})
		.nullable()
		.meta({ description: "The latest rebuild, if there has been one." }),
	worker: z.enum(["idle", "running", "expired"]),
	lastError: z.string().nullable(),
	lastSuccessAt: z.string().nullable().meta({
		description: "When the index was last updated.",
		example: "2026-11-02T09:30:00.000Z",
	}),
}) satisfies z.ZodType<TypesenseStatus>;

export const controllerSchemas = {
	rebuild: {
		body: undefined,
		query: undefined,
		params: undefined,
		response: z.array(
			z.object({
				index: z.string(),
				rebuildId: z.string(),
				jobId: z.string(),
			}),
		),
	} satisfies RouteSchema,
	status: {
		body: undefined,
		query: undefined,
		params: undefined,
		response: z.array(statusSchema),
	} satisfies RouteSchema,
};
