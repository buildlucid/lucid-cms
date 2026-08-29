export const getDelaySeconds = (scheduledFor: Date) => {
	return Math.max(0, Math.ceil((scheduledFor.getTime() - Date.now()) / 1000));
};
