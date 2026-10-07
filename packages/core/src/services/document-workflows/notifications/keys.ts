/** Keys for the per-person assignment notifications, so they can be resolved later. */
export const workflowNotificationKeys = {
	assigned: (workflowId: number, userId: number) =>
		`workflow:${workflowId}:assignee:${userId}`,
};
