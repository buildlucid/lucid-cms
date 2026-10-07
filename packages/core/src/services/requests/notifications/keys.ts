/** Keys for the per-person request notifications, so they can be resolved later. */
export const requestNotificationKeys = {
	review: (requestId: number, userId: number) =>
		`request:${requestId}:review:${userId}`,
	ready: (requestId: number) => `request:${requestId}:ready`,
	failed: (requestId: number) => `request:${requestId}:failed`,
};
