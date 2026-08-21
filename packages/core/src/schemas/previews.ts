import z from "zod";
import type { ControllerSchema } from "../types.js";

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
			mode: z.enum(["perspective", "scoped"]),
			expiresAt: z.iso.datetime(),
		}),
	} satisfies ControllerSchema,
};
