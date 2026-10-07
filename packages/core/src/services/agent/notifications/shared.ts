import z from "zod";

/** Links an agent notification to its chat. */
export const chatHref = (conversationId: string) =>
	`/lucid/agent/chats/${conversationId}`;

/** Data every routine notification carries. */
export const routineData = z.object({
	routineId: z.string(),
	conversationId: z.string(),
	name: z.string(),
	excerpt: z.string(),
});
