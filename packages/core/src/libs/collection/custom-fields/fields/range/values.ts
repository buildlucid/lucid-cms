/** Preserves invalid input shapes for validation while normalizing valid slider values. */
export const normalizeRangeInputValue = (
	value: unknown,
	thumbs?: 1 | 2,
): unknown => {
	if (!Array.isArray(value)) return value;

	const limit = thumbs === 2 ? 2 : 1;
	const limited = value.slice(0, limit);
	if (
		limited.every(
			(item): item is number =>
				typeof item === "number" && Number.isFinite(item),
		)
	) {
		return limited.toSorted((a, b) => a - b);
	}

	return limited;
};

/** Produces the stable array shape used by relation-table inserts and responses. */
export const normalizeStoredRangeValues = (
	value: unknown,
	thumbs?: 1 | 2,
): number[] => {
	if (!Array.isArray(value)) return [];

	const limit = thumbs === 2 ? 2 : 1;
	return value
		.filter(
			(item): item is number =>
				typeof item === "number" && Number.isFinite(item),
		)
		.slice(0, limit)
		.toSorted((a, b) => a - b);
};
