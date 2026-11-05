import z from "zod";
import type {
	ToolkitPreviewCookies,
	ToolkitPreviewResponseHeaders,
} from "./types.js";

export const inputSchema = z.object({
	url: z.union([z.url(), z.instanceof(URL)]),
	cookies: z.custom<ToolkitPreviewCookies>(
		(value) =>
			value !== null &&
			typeof value === "object" &&
			"get" in value &&
			typeof value.get === "function" &&
			"set" in value &&
			typeof value.set === "function" &&
			"delete" in value &&
			typeof value.delete === "function",
		"Provide cookies with get, set and delete methods.",
	),
	headers: z
		.custom<ToolkitPreviewResponseHeaders>(
			(value) =>
				value !== null &&
				typeof value === "object" &&
				"set" in value &&
				typeof value.set === "function",
			"Provide response headers with a set method.",
		)
		.optional(),
});
