import z from "zod";
import { requestDocumentInputSchema } from "../../../../schemas/requests.js";
import { requestWriteSchema } from "../schema.js";

export const inputSchema = requestWriteSchema.extend({
	/** The `reviewToken` from `getSingle`. Rejected once the revision, content or targets change. */
	ifUnchanged: z.string().min(1),
	/** Defaults to every target waiting to be acknowledged. */
	targets: z
		.array(
			z.strictObject({
				collectionKey: requestDocumentInputSchema.shape.collectionKey,
				documentId: requestDocumentInputSchema.shape.documentId,
				target: z.string().trim().min(1),
			}),
		)
		.optional(),
});
