import z from "zod";

export const inputSchema = z.object({
	collectionKey: z.string().meta({
		description: "The collection the documents belong to.",
	}),
	documentIds: z
		.array(z.number().int().positive())
		.min(1)
		.max(20)
		.meta({ description: "Documents to translate, eg. from documents_find." }),
	locales: z.array(z.string().min(1)).min(1).optional().meta({
		description:
			"Locales to translate into, from locales_list. Defaults to the request's locales, or every locale but the collection's default.",
	}),
	requestId: z.number().int().positive().optional().meta({
		description:
			"An open request to translate instead, eg. one a person asked you to translate. Its proposals are translated from their own text and get the translations. The documents must already be in it, and a request limited to some languages only takes those.",
	}),
	overwrite: z.boolean().optional().meta({
		description:
			"Replaces every translation, including ones people wrote or edited. Only when the person asks for it.",
	}),
	note: z.string().trim().min(1).max(2_000).optional().meta({
		description:
			"Instructions for this translation, eg. tone or terms the person asked for.",
	}),
});

export const outputSchema = z.object({
	outcome: z.enum(["requested", "applied"]).meta({
		description:
			"requested when the translations wait in requests for review, or applied when they were saved to latest.",
	}),
	requests: z
		.array(
			z.object({
				id: z.number(),
				locale: z.string(),
				documents: z.number(),
				link: z.string(),
			}),
		)
		.meta({
			description:
				"The requests holding the translations, by locale: one opened per locale, or the request given as requestId. Empty when applied or already up to date.",
		}),
	documents: z.array(z.object({ id: z.number(), link: z.string() })).meta({
		description:
			"Documents whose latest content was saved with translations. Empty unless applied.",
	}),
	failures: z
		.array(
			z.object({
				documentId: z.number(),
				locale: z.string(),
				field: z.string().nullable(),
				message: z.string(),
			}),
		)
		.meta({
			description:
				"Fields that couldn't be translated and kept their translation.",
		}),
});
