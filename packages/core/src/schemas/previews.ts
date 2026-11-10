import z from "zod";
import type { ControllerSchema } from "../types/schema.js";
import { versionTypesSchema } from "./document-versions.js";

const previewTokenSchema = z
	.string()
	.regex(/^[A-Za-z0-9_-]{43}$/)
	.meta({
		description: "An opaque preview token",
	});

export const controllerSchemas = {
	resolve: {
		body: z.object({
			token: previewTokenSchema,
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z.object({
			mode: z.enum(["navigable", "scoped"]),
			expiresAt: z.iso.datetime(),
			entry: z
				.object({
					collectionKey: z.string(),
					documentId: z.number(),
					version: versionTypesSchema,
					versionId: z.number().nullable(),
				})
				.meta({ description: "The document the preview shows" }),
		}),
	} satisfies ControllerSchema,
};
