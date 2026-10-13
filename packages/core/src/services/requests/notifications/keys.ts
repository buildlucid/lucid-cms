/** Request notification keys, with review notifications scoped to each recipient. */
export const requestNotificationKeys = {
	review: (requestId: number, userId: number) =>
		`request:${requestId}:review:${userId}`,
	ready: (requestId: number) => `request:${requestId}:ready`,
	failed: (requestId: number) => `request:${requestId}:failed`,
};
