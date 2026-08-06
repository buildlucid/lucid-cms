import type { DatabaseCodec } from "../../codecs/types.js";
import type { ResultPlan } from "./types.js";

/** Decodes only fields proven by the result plan to have a registered codec. */
export const decodeResultRow = (
	row: unknown,
	plan: ResultPlan,
	adapter: Parameters<DatabaseCodec["decode"]>[1]["adapter"],
): unknown => {
	if (row === null || typeof row !== "object" || Array.isArray(row)) return row;
	const decoded = { ...(row as Record<string, unknown>) };

	for (const [key, entry] of Object.entries(plan)) {
		if (!(key in decoded)) continue;
		let value = decoded[key];
		if (entry.codec?.decodes) {
			value = entry.codec.decode(value, {
				adapter,
				columnType: entry.columnType,
			});
		}

		if (entry.nested && entry.container === "array" && Array.isArray(value)) {
			value = value.map((item) =>
				decodeResultRow(item, entry.nested ?? {}, adapter),
			);
		} else if (entry.nested && entry.container === "object") {
			value = decodeResultRow(value, entry.nested, adapter);
		}

		decoded[key] = value;
	}

	return decoded;
};
