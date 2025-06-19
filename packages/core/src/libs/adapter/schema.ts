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

const MiddlewareHandlerSchema = z.custom<MiddlewareHandler>(
	(data) => typeof data === "function",
	{
		message: "Expected a MiddlewareHandler function",
	},
);
const LucidAdapterSchema = z.object({
	key: z.string(),
	lucid: z.string(),
	runtime: z
		.object({
			middleware: z
				.object({
					beforeMiddleware: z.array(MiddlewareHandlerSchema).optional(),
					afterMiddleware: z.array(MiddlewareHandlerSchema).optional(),
				})
				.optional(),
		})
		.optional(),
	//* depending on the runtime, this can be stripped out on build (see the cloudflare adapter)
	cli: z
		.object({
			serve: ServeHandlerSchema,
			build: BuildHandlerSchema,
		})
		.optional(),
});

export default LucidAdapterSchema;
