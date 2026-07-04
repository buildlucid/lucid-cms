import type { RelationCustomFieldValue } from "../types.js";

/**
 * Guards the relation field value shape used by relation-table storage.
 */
export const isRelationCustomFieldValue = (
	value: unknown,
): value is RelationCustomFieldValue => {
	if (typeof value !== "object" || value === null) return false;
	if (!("id" in value) || !("collectionKey" in value)) return false;

	return (
		typeof value.id === "number" &&
		Number.isFinite(value.id) &&
		typeof value.collectionKey === "string"
	);
};

/**
 * Normalizes raw relation field input into the stored array shape.
 */
export const normalizeStoredRelationCustomFieldValues = (
	value: unknown,
	multiple?: boolean,
): RelationCustomFieldValue[] => {
	if (!Array.isArray(value)) return [];

	const normalizedValues = value.reduce<RelationCustomFieldValue[]>(
		(acc, item) => {
			if (!isRelationCustomFieldValue(item)) return acc;

			acc.push({
				id: item.id,
				collectionKey: item.collectionKey,
			});
			return acc;
		},
		[],
	);

	if (multiple === true) return normalizedValues;
	return normalizedValues.slice(0, 1);
};

/**
 * Preserves invalid non-array input for validation while still enforcing the
 * configured cardinality on valid array payloads.
 */
export const clampRelationFieldInput = (
	value: unknown,
	multiple?: boolean,
): unknown => {
	if (!Array.isArray(value)) return value;
	if (multiple === true) return value;
	return value.slice(0, 1);
};
