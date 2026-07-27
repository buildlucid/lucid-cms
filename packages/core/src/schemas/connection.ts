import z from "zod";
import type { ControllerSchema } from "../types.js";

const connectionStatusResponseSchema = z
	.object({
		status: z.enum(["connected", "disconnected", "revoked"]),
		connection: z
			.object({
				id: z.string(),
				name: z.string().nullable(),
				status: z.literal("active"),
				clientName: z.string(),
				clientOrigin: z.string().nullable(),
			})
			.strict()
			.nullable(),
		organisation: z
			.object({
				id: z.string(),
				name: z.string(),
			})
			.strict()
			.nullable(),
		scope: z.literal("cms:ai"),
		resource: z.string(),
		lastAttempt: z.number().int().nullable(),
		lastVerified: z.number().int().nullable(),
		errorKey: z.string().nullable(),
		warning: z.boolean(),
	})
	.strict();

export const controllerSchemas = {
	connect: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: z
			.object({
				authorizationUrl: z.url(),
			})
			.strict(),
	} satisfies ControllerSchema,
	callback: {
		body: undefined,
		query: {
			string: z
				.object({
					state: z.string().optional(),
					iss: z.string().optional(),
					code: z.string().optional(),
					error: z.string().optional(),
					error_description: z.string().optional(),
				})
				.passthrough(),
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	status: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: connectionStatusResponseSchema,
	} satisfies ControllerSchema,
	verify: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: connectionStatusResponseSchema,
	} satisfies ControllerSchema,
	disconnect: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
};
