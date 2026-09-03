import type { FilterValue } from "../../types/query-params.js";
import type { InMemoryQueryValue } from "./types.js";

/** Compares query values using the record value's primitive type. */
const compareValues = (
	left: InMemoryQueryValue,
	right: FilterValue | undefined,
): number => {
	if (left === right) return 0;
	if (left === null || left === undefined) return -1;
	if (right === null || right === undefined) return 1;

	if (typeof left === "number") {
		const rightNumber = Number(right);
		if (!Number.isNaN(rightNumber)) return left - rightNumber;
	}
	if (typeof left === "boolean") {
		const rightBoolean = right === true || right === "true" || right === "1";
		return Number(left) - Number(rightBoolean);
	}

	return String(left).localeCompare(
		Array.isArray(right) ? right.join(",") : String(right),
	);
};

export default compareValues;
