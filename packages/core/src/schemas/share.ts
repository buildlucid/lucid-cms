import z from "zod";
import type { ControllerSchema } from "../types.js";
import { tokenSchema } from "./media-share-links.js";

export const controllerSchemas = {
	streamMedia: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			token: tokenSchema,
		}),
		response: undefined,
	} satisfies ControllerSchema,
	authorizeStream: {
		body: z.object({
			password: z.string().min(1),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			token: tokenSchema,
		}),
		response: undefined,
	} satisfies ControllerSchema,
};
