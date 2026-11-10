import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import { toolkitActorSchema } from "../../../libs/permission/toolkit-actor.js";
import { LucidError } from "../../../utils/errors/index.js";
import resolveActorUser from "../../users/helpers/resolve-actor-user.js";
import translateDocuments from "../translate-documents.js";

/** Translates several documents into one locale in the background and opens a request for them. */
export const translateDocumentsJob = defineJob({
	key: "core:translate-documents",
	version: 1,
	input: z.object({
		collectionKey: z.string(),
		documentIds: z.array(z.number().int().positive()).min(1),
		locale: z.string(),
		overwrite: z.boolean(),
		note: z.string().optional(),
		actor: toolkitActorSchema,
	}),
	//* each attempt pays for its translations, so failures aren't retried
	retry: { type: "none" },
	handler: async ({ context, input }) => {
		//* a person deleted since it was queued is refused here
		const userRes = await resolveActorUser(context, { actor: input.actor });
		if (userRes.error) throw new LucidError(userRes.error);

		const translatedRes = await translateDocuments(context, {
			collectionKey: input.collectionKey,
			documentIds: input.documentIds,
			targetLocales: [input.locale],
			overwrite: input.overwrite,
			note: input.note,
			delivery: "request",
			user: userRes.data,
			agentRunId: input.actor.agentRunId,
		});
		if (translatedRes.error) throw new LucidError(translatedRes.error);
	},
	describe: ({ input }) => ({
		collectionKey: input.collectionKey,
		locale: input.locale,
		documents: input.documentIds.length,
	}),
});
