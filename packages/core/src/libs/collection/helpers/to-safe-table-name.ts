import { crc32 } from "node:zlib";
import constants from "../../../constants/constants.js";

const HASH_LENGTH = 8;

const crc32Hex = (value: string): string => {
	return (crc32(value) >>> 0).toString(16).padStart(HASH_LENGTH, "0");
};

const byteLength = (value: string): number => Buffer.byteLength(value, "utf8");

/**
 * Converts a table name to a safe table name by truncating the name if it exceeds the limit
 */
const toSafeTableName = (name: string, limit: number | null) => {
	if (
		limit === null ||
		limit === undefined ||
		!Number.isFinite(limit) ||
		byteLength(name) <= limit
	) {
		return {
			name,
			rawName: name,
		};
	}

	const hash = crc32Hex(name);
	const segments = name.split(constants.db.nameSeparator);
	const suffix = `_${hash}`;
	// Keep the first sections stable. For relation tables this preserves:
	// lucid_document__{collection}__{scope}__{relation-separator}
	// and only hashes what's after it.
	if (segments.length > 4) {
		const stablePrefix = segments.slice(0, 4).join(constants.db.nameSeparator);
		const candidate = `${stablePrefix}${suffix}`;
		if (byteLength(candidate) <= limit) {
			return {
				name: candidate,
				rawName: name,
			};
		}
	}

	return {
		name,
		rawName: name,
	};
};

export default toSafeTableName;
