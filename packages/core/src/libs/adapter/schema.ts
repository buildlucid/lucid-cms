import z from "zod";
import type { BuildHandler, ServeHandler } from "./types.js";

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
	handlers: z.object({
		serve: ServeHandlerSchema,
		build: BuildHandlerSchema,
	}),
});

export default LucidAdapterSchema;
