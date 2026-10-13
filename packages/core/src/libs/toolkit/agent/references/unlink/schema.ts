import z from "zod";
import { agentReferenceInputSchema } from "../../../../../schemas/agent-references.js";

export const inputSchema = z.strictObject({
	/** The chat to unlink from, eg. `execution.run.conversationId`. */
	conversationId: z.uuid(),
	references: z.array(agentReferenceInputSchema),
});
