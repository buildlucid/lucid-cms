import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import { LucidError } from "../../../utils/errors/index.js";
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
	key: "core:delete-document",
	version: 1,
	input,
	handler: async ({ context, input }) => {
		const result = await deleteDocument(context, input);
		if (result.error) throw new LucidError(result.error);
	},
	describe: ({ input: { id, collectionKey } }) => ({
		documentId: id,
		collectionKey,
	}),
});
