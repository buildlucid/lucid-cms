import z from "zod";
import type { ControllerSchema } from "../types.js";

export const controllerSchemas = {
	update: {
		body: z
			.object({
				licenseKey: z.string().trim().min(8).max(256).nullable().meta({
					description: "The license key to save",
					example: "lucid_live_***************************************1A2B",
				}),
			})
			.strict(),
		query: {
			string: undefined,
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
		response: z
			.object({
				key: z.string().nullable().meta({
					description: "The stored display version of the license key",
					example: "************************************************1A2B",
				}),
				valid: z.boolean().meta({
					description: "Whether the license is currently valid",
					example: true,
				}),
				lastChecked: z.number().nullable().meta({
					description: "Unix time (seconds) the license was last checked",
					example: 1717098451,
				}),
				errorMessage: z.string().nullable().meta({
					description: "Error message from last verification (if any)",
					example: "License is invalid",
				}),
				ai: z
					.object({
						enabled: z.boolean().meta({
							description: "Whether AI features are enabled for this license",
							example: true,
						}),
					})
					.strict(),
			})
			.strict(),
	} satisfies ControllerSchema,
	verify: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
};
