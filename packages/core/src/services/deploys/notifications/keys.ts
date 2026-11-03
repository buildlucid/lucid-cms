export const deployNotificationKeys = {
	failed: (deployKey: string) => `deploy:${deployKey}:failed`,
	succeeded: (deployKey: string) => `deploy:${deployKey}:succeeded`,
};
