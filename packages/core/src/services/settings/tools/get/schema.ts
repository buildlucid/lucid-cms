import z from "zod";
import { controllerSchemas } from "../../../../schemas/settings.js";

const includeSchema =
	controllerSchemas.getSettings.query.formatted.shape.include.unwrap().element;

export const inputSchema = z.object({
	include: z.array(includeSchema).min(1).default(includeSchema.options).meta({
		description:
			"Which sections to read. Defaults to all: system adapters, media storage, email, AI features, agents with their tools and routines, MCP tools, and the website URL.",
	}),
});

export const outputSchema = z.object({
	data: controllerSchemas.getSettings.response,
});
