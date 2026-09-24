import isPlainObject from "./is-plain-object.js";

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

const hasEveryArrayIndex = (value: readonly unknown[]) => {
	if (
		Object.getOwnPropertySymbols(value).length > 0 ||
		Object.keys(value).length !== value.length
	) {
		return false;
	}
	for (let index = 0; index < value.length; index += 1) {
		if (!Object.hasOwn(value, index)) return false;
	}
	return true;
};

/** Checks for a plain JSON object without cycles or values JSON would discard. */
export const isJsonObject = (
	value: unknown,
): value is Record<string, JsonValue> => {
	if (!isPlainObject(value)) return false;
	const ancestors = new WeakSet<object>();
	const visit = (current: unknown): current is JsonValue => {
		if (
			current === null ||
			typeof current === "string" ||
			typeof current === "boolean"
		)
			return true;
		if (typeof current === "number") return Number.isFinite(current);
		if (typeof current !== "object") return false;
		if (ancestors.has(current)) return false;
		ancestors.add(current);
		const valid = Array.isArray(current)
			? hasEveryArrayIndex(current) && current.every(visit)
			: isPlainObject(current) &&
				Object.getOwnPropertySymbols(current).length === 0 &&
				Object.values(current).every(visit);
		ancestors.delete(current);
		return valid;
	};
	return visit(value);
};
