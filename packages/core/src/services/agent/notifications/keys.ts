/** Keys for the agent notifications that are resolved later. */
export const agentNotificationKeys = {
	input: (conversationId: string) =>
		`agent-conversation:${conversationId}:input`,
	review: (conversationId: string) =>
		`agent-conversation:${conversationId}:review`,
	routineFailed: (routineId: string) => `agent-routine:${routineId}:failed`,
};
