import z from "zod";
import type {
	DocumentTranslationStatus,
	TranslateDocumentsResponse,
	TranslationSettings,
} from "../types/response.js";
import type { ControllerSchema } from "../types/schema.js";
import { brickInputSchema } from "./collection-bricks.js";
import { fieldInputSchema } from "./collection-fields.js";
import { translationSourceSchema } from "./shared/translation-source.js";

const localeCodeSchema = z.string().trim().min(1).max(32);

const translationStatusSchema = z.object({
	locale: localeCodeSchema,
	fields: z.number().int(),
	missing: z.number().int(),
	outdated: z.number().int(),
	byPerson: z.number().int(),
	byPersonOutdated: z.number().int(),
	words: z.object({ update: z.number().int(), overwrite: z.number().int() }),
});

const translationFailureSchema = z.object({
	documentId: z.number(),
	locale: localeCodeSchema,
	field: z.string().nullable(),
	message: z.string(),
});

const glossaryTermBodySchema = z
	.object({
		term: z.string().trim().min(1).max(200),
		locale: localeCodeSchema.nullable().meta({
			description:
				"The target locale the term applies to, or null for every locale",
		}),
		translation: z.string().trim().min(1).max(200).nullable().meta({
			description:
				"The translation to use, or null to keep the term exactly as written",
		}),
	})
	.strict();

const glossaryTermParamsSchema = z.object({
	id: z.string().trim().meta({
		description: "The glossary term ID",
		example: "1",
	}),
});

const translationSettingsSchema = z.object({
	glossary: z.array(
		z.object({
			id: z.number().meta({ description: "The glossary term ID", example: 1 }),
			term: z.string().meta({
				description: "The term as it appears in source text",
				example: "Lucid",
			}),
			locale: z.string().nullable().meta({
				description:
					"The target locale the term applies to, or null for every locale",
				example: "fr",
			}),
			translation: z.string().nullable().meta({
				description:
					"The translation to use, or null to keep the term exactly as written",
			}),
		}),
	),
	styles: z.array(
		z.object({
			locale: z
				.string()
				.meta({ description: "The locale code", example: "fr" }),
			instructions: z.string().meta({
				description: "Notes on tone and style for translations into the locale",
			}),
		}),
	),
}) satisfies z.ZodType<TranslationSettings>;

const noQuery = { string: undefined, formatted: undefined };

const collectionParamsSchema = z.object({
	collectionKey: z.string().trim().meta({
		description: "The collection key",
		example: "page",
	}),
});

export const controllerSchemas = {
	translateDocuments: {
		body: z
			.object({
				documentIds: z.array(z.number().int().positive()).min(1).max(100).meta({
					description: "The documents to translate from their default locale",
				}),
				targetLocales: z
					.array(localeCodeSchema)
					.min(1)
					.meta({
						description: "The locales to translate into",
						example: ["fr", "de"],
					}),
				overwrite: z.boolean().optional().meta({
					description:
						"Replaces every translation, including people's. By default only missing and out-of-date machine translations are made",
				}),
				note: z.string().trim().min(1).max(2_000).optional().meta({
					description: "Instructions for this translation",
				}),
				delivery: z.enum(["request", "editor"]).default("request").meta({
					description:
						"Opens a request per locale (default), or returns the values for the open editor without saving",
				}),
				content: z
					.object({
						bricks: z.array(brickInputSchema),
						fields: z.array(fieldInputSchema),
					})
					.optional()
					.meta({
						description:
							"The open editor's unsaved content to translate instead of the saved document. Editor delivery only",
					}),
			})
			.strict(),
		query: noQuery,
		params: collectionParamsSchema,
		response: z.union([
			z.object({
				delivery: z.literal("request"),
				requests: z.array(
					z.object({
						id: z.number(),
						locale: localeCodeSchema,
						documents: z.number(),
					}),
				),
				queued: z.boolean(),
				failures: z.array(translationFailureSchema),
			}),
			z.object({
				delivery: z.literal("editor"),
				changes: z.array(
					z.object({
						brick: z.string().nullable(),
						path: z.array(z.string()),
						locale: localeCodeSchema,
						value: z.any(),
						source: translationSourceSchema,
					}),
				),
				failures: z.array(translationFailureSchema),
			}),
		]) satisfies z.ZodType<TranslateDocumentsResponse>,
	} satisfies ControllerSchema,
	getStatus: {
		body: z
			.object({
				documentIds: z
					.array(z.number().int().positive())
					.min(1)
					.max(100)
					.meta({ description: "The documents to report on" }),
			})
			.strict(),
		query: noQuery,
		params: collectionParamsSchema,
		response: z.array(
			z.object({
				collectionKey: z.string(),
				documentId: z.number(),
				sourceLocale: localeCodeSchema,
				locales: z.array(translationStatusSchema),
			}),
		) satisfies z.ZodType<DocumentTranslationStatus[]>,
	} satisfies ControllerSchema,
	getSettings: {
		body: undefined,
		query: noQuery,
		params: undefined,
		response: translationSettingsSchema,
	} satisfies ControllerSchema,
	createGlossaryTerm: {
		body: glossaryTermBodySchema,
		query: noQuery,
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	updateGlossaryTerm: {
		body: glossaryTermBodySchema,
		query: noQuery,
		params: glossaryTermParamsSchema,
		response: undefined,
	} satisfies ControllerSchema,
	deleteGlossaryTerm: {
		body: undefined,
		query: noQuery,
		params: glossaryTermParamsSchema,
		response: undefined,
	} satisfies ControllerSchema,
	updateStyle: {
		body: z
			.object({
				instructions: z.string().trim().max(4_000).meta({
					description:
						"Notes on tone and style for translations into the locale. Empty removes them.",
				}),
			})
			.strict(),
		query: noQuery,
		params: z.object({
			locale: localeCodeSchema.meta({
				description: "The locale code",
				example: "fr",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
};
