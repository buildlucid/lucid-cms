import z from "zod";
import { aiModelCatalogSchema } from "../../../../libs/agent/model-selection.js";

export const inputSchema = z.object({}).strict();

export const outputSchema = z.object({
	agents: z.array(
		z.object({
			key: z.string(),
			name: z.string(),
			description: z.string(),
			defaultModel: aiModelCatalogSchema.shape.default.meta({
				description: "Used when the start call names no model.",
			}),
			models: z.array(
				aiModelCatalogSchema.shape.models.element.pick({
					id: true,
					name: true,
					description: true,
					reasoningEfforts: true,
				}),
			),
		}),
	),
});
