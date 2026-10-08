import z from "zod";
import { agentReferenceInputSchema } from "../../../../../schemas/agent-references.js";

export const inputSchema = z.object({
	/** The chat to link to, eg. `execution.run.conversationId`. */
	conversationId: z.uuid(),
	/** The tool managing the links. People see it as the reason they cannot remove them. */
	toolName: z.string().trim().min(1),
	references: z.array(agentReferenceInputSchema),
});
