/** Formats milliseconds for people, such as `850ms` or `12.4s`. */
const formatDuration = (ms: number): string =>
	ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;

export default formatDuration;
