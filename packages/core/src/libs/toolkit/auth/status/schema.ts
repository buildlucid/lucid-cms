import z from "zod";
import type {
	ToolkitAuthCookieStore,
	ToolkitAuthResponseHeaders,
} from "./types.js";

export const inputSchema = z.object({
	cookies: z.custom<ToolkitAuthCookieStore>(
		(value) =>
			value !== null &&
			typeof value === "object" &&
			"get" in value &&
			typeof value.get === "function",
		"Provide a cookie store with a get method.",
	),
	headers: z
		.custom<ToolkitAuthResponseHeaders>(
			(value) =>
				value !== null &&
				typeof value === "object" &&
				"set" in value &&
				typeof value.set === "function",
			"Provide response headers with a set method.",
		)
		.optional(),
});
