import z from "zod";
import { documentIdInput, writeInput, writeOutputSchema } from "../schema.js";

export const inputSchema = z.object({
	collectionKey: writeInput.collectionKey,
	documentId: documentIdInput,
	requestId: writeInput.requestId,
	request: writeInput.request,
});

export const outputSchema = writeOutputSchema;
