/** SQLite CURRENT_TIMESTAMP output, eg. `2026-10-06 00:35:14`. UTC, but carries no zone. */
const SQLITE_TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/;

/** Formats a database or given date as a UTC ISO string, or null when there is none or it can't be read. */
const formatDate = (value: Date | string | null | undefined) => {
	if (value === null || value === undefined) return null;

	const date =
		value instanceof Date
			? value
			: new Date(
					SQLITE_TIMESTAMP.test(value) ? `${value.replace(" ", "T")}Z` : value,
				);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export default formatDate;
