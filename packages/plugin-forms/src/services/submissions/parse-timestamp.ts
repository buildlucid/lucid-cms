/**
 * Reads a timestamp as each database returns it: a date, an ISO string, or SQLite's
 * `YYYY-MM-DD HH:MM:SS`, which is UTC but doesn't say so. Returns its time in milliseconds, or
 * null when it isn't a date.
 */
const parseTimestamp = (value: unknown): number | null => {
	if (value instanceof Date) return value.getTime();
	if (typeof value !== "string") return null;

	const time = Date.parse(
		/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)
			? `${value.replace(" ", "T")}Z`
			: value,
	);
	return Number.isNaN(time) ? null : time;
};

export default parseTimestamp;
