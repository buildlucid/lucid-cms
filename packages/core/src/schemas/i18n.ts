import z from "zod";
import type { ControllerSchema } from "../types.js";

export const controllerSchemas = {
	getAdminTranslations: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			locale: z.string().min(1).optional(),
		}),
		response: z.object({
			locale: z.string(),
			defaultLocale: z.string(),
			direction: z.enum(["ltr", "rtl"]),
			locales: z.array(
				z.object({
					code: z.string(),
					label: z.string(),
					direction: z.enum(["ltr", "rtl"]),
					isDefault: z.boolean(),
				}),
			),
			translations: z.record(z.string(), z.string()),
		}),
	} satisfies ControllerSchema,
};
