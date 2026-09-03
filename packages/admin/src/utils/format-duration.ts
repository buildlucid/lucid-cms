/** Formats a millisecond duration for compact admin tables. */
const formatDuration = (durationMs?: number | null) => {
	if (durationMs === undefined || durationMs === null) return undefined;
	if (durationMs < 1000) return `${durationMs}ms`;

	const seconds = Math.round(durationMs / 1000);
	if (seconds < 60) return `${seconds}s`;

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ${seconds % 60}s`;

	const hours = Math.floor(minutes / 60);
	return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
};

export default formatDuration;
