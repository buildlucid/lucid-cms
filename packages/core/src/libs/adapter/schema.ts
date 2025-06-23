import z from "zod/v4";
import type { BuildHandler, MiddlewareHandler, ServeHandler } from "./types.js";

const ServeHandlerSchema = z.custom<ServeHandler>(
	(data) => typeof data === "function",
	{
		message: "Expected a ServeAppHandler function",
	},
);

const BuildHandlerSchema = z.custom<BuildHandler>(
	(data) => typeof data === "function",
	{
		message: "Expected a BuildHandler function",
	},
);

const LucidAdapterSchema = z.object({
	key: z.string(),
	lucid: z.string(),

	getEnvVars: z.custom<() => Promise<Record<string, string>>>(
		(data) => typeof data === "function",
		{
			message: "Expected a getEnvVars function",
		},
	),
	cli: z
		.object({
			serve: ServeHandlerSchema,
			build: BuildHandlerSchema,
		})
		.optional(),
});

export default LucidAdapterSchema;
