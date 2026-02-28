import z from "zod";
import type { ControllerSchema } from "../types.js";
import { queryString } from "./helpers/querystring.js";

const settingsResponseSchema = z.object({
	email: z
		.object({
			simulated: z.boolean().meta({
				description: "Whether emails are simulated",
				example: false,
			}),
			templates: z.array(z.string()).meta({
				description: "The supported email templates",
				example: ["reset-password", "user-invite"],
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
		})
		.optional(),
	media: z
		.object({
			enabled: z.boolean().meta({
				description:
					"Whether media is supported. Based on if the media strategy has been set",
				example: true,
			}),
			storage: z.object({
				total: z.number().nullable().meta({
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
		})
		.optional(),
	license: z
		.object({
			key: z.string().nullable().meta({
				description: "The obfuscated license key (last 4 visible)",
				example:
					"******-************-***************-****************-****1A2B",
			}),
		})
		.optional(),
	system: z
		.object({
			runtime: z.string().meta({
				description: "The runtime adapter key",
				example: "node",
			}),
			database: z.string().meta({
				description: "The database adapter key",
				example: "sqlite",
			}),
			kv: z.string().meta({
				description: "The KV adapter key",
				example: "memory",
			}),
			queue: z.string().meta({
				description: "The queue adapter key",
				example: "worker",
			}),
			media: z.string().nullable().meta({
				description: "The media adapter key",
				example: "file-system",
			}),
			email: z.string().meta({
				description: "The email adapter key",
				example: "smtp",
			}),
			imageProcessor: z.string().nullable().meta({
				description: "The image processor key",
				example: "sharp",
			}),
		})
		.optional(),
});

export const controllerSchemas = {
	getSettings: {
		body: undefined,
		query: {
			string: z
				.object({
					include: queryString.schema.include("email,media,license,system"),
				})
				.meta(queryString.meta),
			formatted: z.object({
				include: z
					.array(z.enum(["email", "media", "license", "system"]))
					.optional(),
			}),
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
