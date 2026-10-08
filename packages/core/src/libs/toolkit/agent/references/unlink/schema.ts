import z from "zod";
import { agentReferenceInputSchema } from "../../../../../schemas/agent-references.js";

export const inputSchema = z.object({
	/** The chat to unlink from, eg. `execution.run.conversationId`. */
	conversationId: z.uuid(),
	references: z.array(agentReferenceInputSchema),
});
