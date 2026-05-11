export const getDelaySeconds = (scheduledFor?: Date) => {
	if (!scheduledFor) return undefined;
	return Math.max(0, Math.ceil((scheduledFor.getTime() - Date.now()) / 1000));
};
