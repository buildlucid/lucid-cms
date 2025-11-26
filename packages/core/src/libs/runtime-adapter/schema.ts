import z from "zod/v4";
import type { BuildHandler, ServeHandler } from "./types.js";
import type { CLILogger } from "../cli/logger.js";

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

const RuntimeAdapterSchema = z.object({
	key: z.string(),
	config: z
		.object({
			customBuildArtifacts: z.array(z.string()).optional(),
		})
		.optional(),
	lucid: z.string(),
	getEnvVars: z.custom<
		(props: {
			logger: {
				instance: CLILogger;
				silent: boolean;
			};
		}) => Promise<Record<string, unknown>>
	>((data) => typeof data === "function", {
		message: "Expected a getEnvVars function",
	}),
	cli: z.object({
		serve: ServeHandlerSchema,
		build: BuildHandlerSchema,
	}),
});

export default RuntimeAdapterSchema;
