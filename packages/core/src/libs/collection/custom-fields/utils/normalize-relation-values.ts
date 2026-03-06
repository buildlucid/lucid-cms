/**
 * Returns true when the submitted relation input uses the array shape required by
 * relation-table fields.
 */
export const isRelationValueArray = (value: unknown): value is unknown[] => {
	return Array.isArray(value);
};

/**
 * Clamps relation input values to the configured cardinality without coercing the
 * input type. Validation can then reject invalid scalar or non-number values.
 */
export const clampRelationInputValue = (
	value: unknown,
	multiple?: boolean,
): unknown => {
	if (!isRelationValueArray(value)) return value;
	if (multiple === true) return value;

	return value.slice(0, 1);
};

/**
 * Extracts a finite numeric relation identifier from a raw array item.
 */
const toNumber = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	return null;
};

/**
 * Normalizes stored relation values into a numeric array for inserts and response
 * formatting. Non-array input is treated as invalid and discarded.
 */
export const normalizeRelationValues = (value: unknown): number[] => {
	if (!isRelationValueArray(value)) return [];

	return value.reduce<number[]>((acc, item) => {
		const parsedValue = toNumber(item);
		if (parsedValue !== null) acc.push(parsedValue);
		return acc;
	}, []);
};

/**
 * Enforces single or multi relation cardinality on an already-normalized value.
 */
export const limitRelationValues = (
	values: number[],
	multiple?: boolean,
): number[] => {
	if (multiple === true) return values;
	return values.slice(0, 1);
};

/**
 * Produces a safe stored representation for relation-table fields.
 */
export const normalizeStoredRelationValues = (
	value: unknown,
	multiple?: boolean,
): number[] => {
	return limitRelationValues(normalizeRelationValues(value), multiple);
};
