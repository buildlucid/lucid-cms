import z from "zod/v4";
import type { ControllerSchema } from "../types.js";

export const controllerSchemas = {
	update: {
		body: z
			.object({
				licenseKey: z.string().min(1).nullable().meta({
					description: "The license key to save",
					example:
						"******-************-***************-****************-********",
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
					description: "The obfuscated license key (last 4 visible)",
					example:
						"******-************-***************-****************-****1A2B",
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
