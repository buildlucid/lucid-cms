import z from "zod";
import type { ControllerSchema } from "../exports/types.js";

const formSchema = z.object({
	enabled: z.boolean().meta({
		description: "Whether the form needs a captcha token",
		example: true,
	}),
	action: z.string().meta({
		description: "The action the form's token must carry",
		example: "lucid_login",
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
		response: z
			.object({
				adapter: z.string().meta({
					description: "The captcha adapter key",
					example: "cloudflare-turnstile",
				}),
				client: z.record(z.string(), z.unknown()).meta({
					description: "Public values the widget needs, such as a site key",
					example: { siteKey: "0x4AAAAAAA" },
				}),
				forms: z.object({
					login: formSchema,
					magicLink: formSchema,
					setup: formSchema,
					requestPasswordReset: formSchema,
					resetPassword: formSchema,
					acceptInvitation: formSchema,
					sharePassword: formSchema,
				}),
			})
			.nullable(),
	} satisfies ControllerSchema,
};
