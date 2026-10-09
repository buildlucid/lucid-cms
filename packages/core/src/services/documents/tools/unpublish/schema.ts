import z from "zod";
import { documentIdInput, writeInput, writeOutputSchema } from "../schema.js";

export const inputSchema = z.object({
	collectionKey: writeInput.collectionKey,
	documentId: documentIdInput,
	target: z.string().trim().min(1).meta({
		description:
			"The publishing target to remove the document from, from collections_describe.",
	}),
	requestId: writeInput.requestId,
	request: writeInput.request,
});

export const outputSchema = writeOutputSchema;
