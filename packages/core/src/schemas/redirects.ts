import z from "zod";
import type { ControllerSchema } from "../exports/types.js";
import { queryString } from "./helpers/querystring.js";

/** A root-relative path on the website, such as `/about`, shared by the content route and toolkit. */
export const redirectPathSchema = z
	.string()
	.trim()
	.startsWith("/")
	.refine((path) => !path.startsWith("//"), {
		message: "Expected a path on this site, not a full address.",
	});

const redirectResponseSchema = z
	.object({
		location: z.string().meta({
			description:
				"Where to send the visitor: a root-relative path or a full address",
			example: "/company/about",
		}),
		status: z.union([
			z.literal(301),
			z.literal(302),
			z.literal(307),
			z.literal(308),
		]),
	})
	.nullable();

export const controllerSchemas = {
	content: {
		resolve: {
			query: {
				string: z
					.object({
						path: redirectPathSchema.meta({
							description:
								"The path the website couldn't find, without a query string",
							example: "/about",
						}),
						environment: z.string().trim().min(1).default("latest").meta({
							description:
								"The environment the website shows. Defaults to latest",
							example: "production",
						}),
						locale: z.string().trim().min(1).optional().meta({
							description:
								"The visitor's locale, preferred when a path redirects differently per locale",
							example: "en",
						}),
					})
					.meta(queryString.meta),
				formatted: undefined,
			},
			params: undefined,
			body: undefined,
			response: redirectResponseSchema,
		} satisfies ControllerSchema,
	},
};
