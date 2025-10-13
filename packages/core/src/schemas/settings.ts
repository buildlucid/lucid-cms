import z from "zod/v4";
import type { ControllerSchema } from "../types.js";

const settingsResponseSchema = z.object({
	email: z.object({
		enabled: z.boolean().meta({
			description:
				"Whether emails are supported. Based on if the email strategy has been set",
			example: true,
		}),
		from: z
			.object({
				email: z.email().meta({
					description: "The default from address",
					example: "admin@lucidcms.io",
				}),
				name: z.string().meta({
					description: "The default from name",
					example: "Admin",
				}),
			})
			.nullable(),
	}),
	media: z.object({
		enabled: z.boolean().meta({
			description:
				"Whether media is supported. Based on if the media strategy has been set",
			example: true,
		}),
		storage: z.object({
			total: z.number().meta({
				description: "The total available storage",
				example: 1024,
			}),
			remaining: z.number().nullable().meta({
				description: "The remaining storage left",
				example: 136,
			}),
			used: z.number().nullable().meta({
				description: "The total storage used so far",
				example: 888,
			}),
		}),
		processed: z.object({
			stored: z.boolean().meta({
				description:
					"Whether or not processed images are stored in you configured storage solution or not",
				example: true,
			}),
			imageLimit: z.number().meta({
				description:
					"The number of processed images that can be stored. Once meta future images are generated on request",
				example: 10,
			}),
			total: z.number().nullable().meta({
				description: "How many processed images exist",
				example: 100,
			}),
		}),
	}),
	license: z.object({
		key: z.string().nullable().meta({
			description: "The obfuscated license key (last 4 visible)",
			example: "******-************-***************-****************-****1A2B",
		}),
	}),
});

export const controllerSchemas = {
	getSettings: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: settingsResponseSchema,
	} satisfies ControllerSchema,
	clearKV: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
};
