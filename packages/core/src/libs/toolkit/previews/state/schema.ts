import z from "zod";
import type {
	ToolkitPreviewResponseHeaders,
	ToolkitPreviewStore,
} from "./types.js";

export const inputSchema = z.object({
	url: z.union([z.url(), z.instanceof(URL)]),
	session: z.custom<ToolkitPreviewStore>(
		(value) =>
			value !== null &&
			typeof value === "object" &&
			"get" in value &&
			typeof value.get === "function" &&
			"set" in value &&
			typeof value.set === "function" &&
			"clear" in value &&
			typeof value.clear === "function",
		"Provide a preview store with get, set and clear methods.",
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
