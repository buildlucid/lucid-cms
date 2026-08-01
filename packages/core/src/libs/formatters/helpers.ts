import type { BooleanInt } from "../db/types.js";

const formatDate = (date: Date | string | null | undefined): string | null => {
	if (typeof date === "string") {
		return date;
	}
	return date ? date.toISOString() : null;
};

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
