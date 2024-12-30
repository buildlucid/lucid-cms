import type DatabaseAdapter from "../../libs/db/adapter.js";
import type { BooleanInt } from "../../types.js";

/**
 * Handles formatting for boolean values that are to be inserted into the DB
 */
function insertFormat(bool: boolean, db: DatabaseAdapter): BooleanInt;
function insertFormat(
	bool: boolean | undefined,
	db: DatabaseAdapter,
): BooleanInt | undefined;
function insertFormat(
	bool: boolean | null,
	db: DatabaseAdapter,
): BooleanInt | null;
function insertFormat(
	bool: boolean | null | undefined,
	db: DatabaseAdapter,
): BooleanInt | null | undefined;
function insertFormat(
	bool: boolean | null | undefined,
	db: DatabaseAdapter,
): BooleanInt | null | undefined {
	if (bool === undefined) return undefined;
	if (bool === null) return null;
	if (db.config.support.boolean) {
		return bool;
	}
	if (bool) return 1;
	return 0;
}

/**
 * Handles formatting a BooleanInt response from the DB to a boolean
 */
function responseFormat(bool: BooleanInt): boolean;
function responseFormat(bool: BooleanInt | null | undefined): boolean | null;
function responseFormat(bool: BooleanInt | null | undefined): boolean | null {
	if (bool === null) return null;
	if (typeof bool === "boolean") return bool;
	if (bool === 1) return true;
	return false;
}

/**
 * Entry point for boolean helpers
 */
const boolean = {
	insertFormat,
	responseFormat,
};

export default boolean;
