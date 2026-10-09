import z from "zod";
import { writeInput, writeOutputSchema } from "../schema.js";

export const inputSchema = z.object({
	collectionKey: writeInput.collectionKey,
	id: z.number().int().positive(),
	requestId: writeInput.requestId,
	request: writeInput.request,
});

export const outputSchema = writeOutputSchema;
