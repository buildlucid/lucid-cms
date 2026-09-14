import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import deleteDocument from "../delete-single-permanently.js";

const input = z.object({
	id: z.number().int().positive(),
	collectionKey: z.string().min(1),
	userId: z.number().int().positive().nullable(),
});

/**
 * Deletes a single document
 */
export const deleteDocumentJob = defineJob({
	name: "core:delete-document",
	version: 1,
	input,
	handler: ({ context, input }) => deleteDocument(context, input),
	describe: ({ input: { id, collectionKey } }) => ({
		documentId: id,
		collectionKey,
	}),
});
