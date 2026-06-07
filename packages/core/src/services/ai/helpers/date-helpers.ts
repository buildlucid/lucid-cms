const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;

/** Adds calendar days in UTC so chart buckets remain stable across timezones. */
export const addDays = (date: Date, days: number) => {
	const next = new Date(date);
	next.setUTCDate(next.getUTCDate() + days);
	return next;
};

/** Converts a Date to the YYYY-MM-DD bucket key used by usage chart responses. */
export const getDateKey = (date: Date) => date.toISOString().slice(0, 10);

/** Parses a chart date key strictly so invalid input does not roll into a date. */
export const parseDateKey = (value: string) => {
	if (!dateKeyRegex.test(value)) return null;

	const date = new Date(`${value}T00:00:00.000Z`);
	if (Number.isNaN(date.getTime())) return null;
	return date;
};

/** Formats UTC dates for DB comparisons without relying on adapter-specific casts. */
export const formatDbTimestamp = (date: Date) =>
	date.toISOString().slice(0, 19).replace("T", " ");

/** Normalizes DB timestamp values so duration/chart logic can compare them safely. */
export const parseStoredTimestamp = (value: Date | string) => {
	if (value instanceof Date) return value;

	const normalized = value.includes("T") ? value : value.replace(" ", "T");
	const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
	return new Date(hasTimezone ? normalized : `${normalized}Z`);
};
