import { parseStoredTimestamp } from "./date-helpers.js";

/** Measures elapsed API request time for usage, returning null for invalid stored timestamps. */
const getRequestDurationMs = (startedAt: number | Date | string) => {
	const started =
		typeof startedAt === "number"
			? startedAt
			: parseStoredTimestamp(startedAt).getTime();

	return Number.isNaN(started) ? null : Math.max(0, Date.now() - started);
};

export default getRequestDurationMs;
