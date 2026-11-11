/** Formats milliseconds for people, such as `850ms`, `12.4s` or `9m 07s`. */
const formatDuration = (ms: number): string => {
	if (ms < 1000) {
		return `${Math.round(ms)}ms`;
	}
	if (ms < 59_950) {
		return `${(ms / 1000).toFixed(1)}s`;
	}
	const seconds = Math.round(ms / 1000);
	return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
};

export default formatDuration;
