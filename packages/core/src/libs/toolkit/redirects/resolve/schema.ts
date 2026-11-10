import z from "zod";
import { redirectPathSchema } from "../../../../schemas/redirects.js";

export const inputSchema = z.object({
	/** A root-relative path without a query string, such as `/about`. */
	path: redirectPathSchema,
	/** The environment the website shows, or `latest`. Defaults to `latest`. */
	environment: z.string().trim().min(1).default("latest"),
	/** The visitor's locale, preferred when a path redirects differently per locale. */
	locale: z.string().trim().min(1).optional(),
});
