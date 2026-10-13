import z from "zod";
import type { AgentActor } from "../../types/response.js";

/** An agent that acted, for the person shown alongside it or for the system. */
export const agentActorSchema = z.object({
	key: z.string(),
	name: z.string(),
	system: z.boolean().meta({
		description:
			"It acted as the system rather than for a person. A missing person with this false was deleted",
	}),
	conversationId: z.string().nullable().meta({
		description: "The chat it acted in. Null once the chat is deleted",
	}),
}) satisfies z.ZodType<AgentActor>;
