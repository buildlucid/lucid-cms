import z from "zod";
import {
	aiModelSelectionSchema,
	aiReasoningEffortSchema,
} from "../../../../libs/agent/model-selection.js";
import runnerTools from "../../../../libs/agent/runner-tools.js";
import { subagentAgentsToolName } from "../subagent-agents/constants.js";

export const inputSchema = z.object({
	agentKey: z
		.string()
		.min(1)
		.meta({
			description: `The key of an agent from ${subagentAgentsToolName}.`,
		}),
	task: z.string().trim().min(1).max(20_000).meta({
		description:
			"Everything the sub-agent needs to work on its own: the goal, the context it can't see, and what to report back. It can't read this chat.",
	}),
	title: z
		.string()
		.trim()
		.min(1)
		.max(80)
		.optional()
		.meta({ description: "A short name for its chat, eg. 'Audit blog SEO'." }),
	//* models fill optional fields that take null with null, so tool inputs never take it
	model: aiModelSelectionSchema
		.extend({ reasoningEffort: aiReasoningEffortSchema.optional() })
		.optional()
		.meta({
			description: `A model and reasoning effort from ${subagentAgentsToolName}. Leave out to use the agent's default.`,
		}),
	referenceIds: z
		.array(z.uuid())
		.max(20)
		.optional()
		.meta({
			description: `IDs from ${runnerTools.references.name} for media, documents or requests the sub-agent should have attached.`,
		}),
});

export const outputSchema = z.object({
	subagentId: z.uuid(),
	agentKey: z.string(),
	model: aiModelSelectionSchema,
});
