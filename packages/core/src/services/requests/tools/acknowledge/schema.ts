import z from "zod";
import { requestIdInput, requestLinksSchema } from "../schema.js";

const targetSchema = z.object({
	collectionKey: z.string().min(1),
	documentId: z.number().int().positive(),
	target: z.string().min(1),
});

export const inputSchema = z.object({
	requestId: requestIdInput,
	reviewToken: z.string().min(1).meta({
		description:
			"From requests_get. Rejected if the request changed since, so read it again.",
	}),
	targets: z.array(targetSchema).optional().meta({
		description:
			"Defaults to every target someone else changed that still needs acknowledging.",
	}),
});

export const outputSchema = z.object({
	acknowledged: z.array(targetSchema),
	links: requestLinksSchema,
});
