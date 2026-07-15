import z from "zod";
import type { ControllerSchema } from "../types.js";
import { versionTypesSchema } from "./document-versions.js";

const previewTokenSchema = z.string().meta({
	description: "An opaque preview token",
});

export const controllerSchemas = {
	resolve: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			token: previewTokenSchema,
		}),
		response: z.object({
			mode: z.enum(["perspective", "exact"]),
			entry: z.object({
				collectionKey: z.string(),
				documentId: z.number(),
				versionType: versionTypesSchema,
				versionId: z.number().nullable(),
			}),
			expiresAt: z.iso.datetime(),
		}),
	} satisfies ControllerSchema,
};
