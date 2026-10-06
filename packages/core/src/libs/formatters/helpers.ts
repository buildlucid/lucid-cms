import type { BooleanInt } from "../db/types.js";

/** SQLite CURRENT_TIMESTAMP output, eg. `2026-10-06 00:35:14`. UTC, but carries no zone. */
const SQLITE_TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/;

/**
 * Formats a DB date as a UTC ISO string. Zone-less SQLite timestamps are read as UTC,
 * so browsers don't parse them as local time. Unparseable strings are returned as is.
 */
function formatDate(date: Date | string): string;
function formatDate(date: null | undefined): null;
function formatDate(date: Date | string | null | undefined): string | null;
function formatDate(date: Date | string | null | undefined): string | null {
	if (typeof date === "string") {
		const parsed = new Date(
			SQLITE_TIMESTAMP.test(date) ? `${date.replace(" ", "T")}Z` : date,
		);
		return Number.isNaN(parsed.getTime()) ? date : parsed.toISOString();
	}
	return date ? date.toISOString() : null;
}

const parseJSON = <T>(json: string | null | undefined): T | null => {
	if (typeof json === "object") return json;
	if (!json) return null;
	try {
		return JSON.parse(json);
	} catch (_error) {
		return null;
	}
};

const stringifyJSON = (json: Record<string, unknown> | null): string | null => {
	try {
		if (!json) return null;
		return JSON.stringify(json);
	} catch (_error) {
		return null;
	}
};

const parseCount = (count: string | number | undefined) => {
	if (typeof count === "number") return count;
	return Number.parseInt(count || "0", 10) || 0;
};

/** Used to normalize user input date to a ISO string */
const normalizeDate = (date: Date | string | null | undefined) => {
	if (date === null) return null;
	if (date === undefined) return undefined;

	const dateObject = typeof date === "string" ? new Date(date) : date;

	if (Number.isNaN(dateObject.getTime())) {
		return null;
	}

	return dateObject.toISOString();
};

/**
 * Handles formatting a BooleanInt response from the DB to a boolean
 */
function formatBoolean(bool: BooleanInt): boolean;
function formatBoolean(bool: BooleanInt | null | undefined): boolean | null;
function formatBoolean(bool: BooleanInt | null | undefined): boolean | null {
	if (bool === null || bool === undefined) return null;
	if (typeof bool === "boolean") return bool;
	return bool === 1;
}

export default {
	formatDate,
	parseJSON,
	stringifyJSON,
	parseCount,
	normalizeDate,
	formatBoolean,
};
