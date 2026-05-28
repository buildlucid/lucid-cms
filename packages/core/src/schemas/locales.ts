import z from "zod";
import type { ControllerSchema } from "../types.js";

const localeResponseSchema = z.object({
	code: z.string().meta({
		description: "The locale code",
		example: "en",
	}),
	name: z.string().meta({
		description: "The locale's name",
		example: "English",
	}),
	direction: z.enum(["ltr", "rtl"]).meta({
		description: "The text direction for content written in this locale",
		example: "ltr",
	}),
	isDefault: z.boolean().meta({
		description:
			"Whether this locale is the default for all content in the CMS",
		example: true,
	}),
	createdAt: z.string().nullable().meta({
		description: "Timestamp when the locale was added",
		example: "2024-04-25T14:30:00.000Z",
	}),
	updatedAt: z.string().nullable().meta({
		description: "Timestamp when the locale was last modified",
		example: "2024-04-25T14:30:00.000Z",
	}),
});

export const controllerSchemas = {
	getSingle: {
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			code: z.string().trim().min(2).meta({
				description: "The locales code",
				example: "en",
			}),
		}),
		body: undefined,
		response: localeResponseSchema,
	} satisfies ControllerSchema,
	getAll: {
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		body: undefined,
		response: z.array(localeResponseSchema),
	} satisfies ControllerSchema,
	client: {
		getAll: {
			query: {
				string: undefined,
				formatted: undefined,
			},
			params: undefined,
			body: undefined,
			response: z.array(localeResponseSchema),
		} satisfies ControllerSchema,
	},
};
