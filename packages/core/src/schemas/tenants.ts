import z from "zod";
import { adminCopyDescriptorSchema } from "../libs/i18n/index.js";
import type { ControllerSchema } from "../types.js";

export const controllerSchemas = {
	getAll: {
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		body: undefined,
		response: z.array(
			z.object({
				key: z.string().meta({
					description: "The tenant key",
					example: "alpha",
				}),
				name: adminCopyDescriptorSchema.meta({
					description: "The tenant's name",
					example: {
						type: "lucid.copy",
						scope: "admin",
						key: "tenants.alpha.name",
						defaultMessage: "Alpha",
					},
				}),
				default: z.boolean().optional().meta({
					description: "Whether this tenant is the default admin selection",
					example: true,
				}),
			}),
		),
	} satisfies ControllerSchema,
};
