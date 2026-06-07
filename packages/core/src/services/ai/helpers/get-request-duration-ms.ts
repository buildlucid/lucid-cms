/**
 * Measures the full API request work we persist for AI usage, not only the
 * remote provider call.
 */
const getRequestDurationMs = (startedAt: number, endedAt = Date.now()) =>
	Math.max(0, endedAt - startedAt);

export default getRequestDurationMs;
