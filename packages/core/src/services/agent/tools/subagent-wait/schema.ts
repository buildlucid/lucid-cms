import z from "zod";
import { agentRunStatusSchema } from "../../../../schemas/agent.js";

export const inputSchema = z.object({
	subagentIds: z.array(z.uuid()).min(1).max(20).optional().meta({
		description:
			"The sub-agents to wait for. Leave out to wait for every sub-agent still working, plus any that finished since you last heard from them.",
	}),
	until: z.enum(["all", "any"]).default("all").meta({
		description: "Wait for all of them, or return once any one finishes.",
	}),
});

export const outputSchema = z.object({
	results: z.array(
		z.object({
			subagentId: z.uuid(),
			agentKey: z.string(),
			title: z.string(),
			status: agentRunStatusSchema,
			reply: z.string().nullable(),
			errorMessage: z.string().nullable(),
		}),
	),
});

/** The sub-agent chats a run waits on, and whether one finishing is enough. Saved with the run while it waits. */
export const waitDataSchema = z
	.object({
		subagentIds: z.array(z.uuid()).min(1),
		until: z.enum(["all", "any"]),
	})
	.strict();

/** The runner answers the wait itself once it's over, so there's nothing to respond with. */
export const waitResponseSchema = z.object({}).strict();
