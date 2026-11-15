import z from "zod";
import type { NotificationReceivable } from "../../../libs/notifications/types.js";
import { hasAgentPermission } from "../../../libs/permission/agent-permissions.js";

/** Links an agent notification to its chat. */
export const chatHref = (conversationId: string) =>
	`/admin/agent/chats/${conversationId}`;

/** Data every routine notification carries. */
export const routineData = z.object({
	routineId: z.string(),
	conversationId: z.string(),
	name: z.string(),
	excerpt: z.string(),
});

/** People who can chat with or manage routines for any agent. */
export const receivesAgent: NotificationReceivable = ({ user, config }) =>
	config.ai.agents.some((agent) => hasAgentPermission(user, agent.key));
