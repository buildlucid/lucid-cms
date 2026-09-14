export type QueryBatchOptions = {
	/** Bound parameters added by each item, including repeated placeholders. */
	parametersPerItem: number;
	/** Parameters outside the item list, such as filters and conflict updates. */
	reservedParameters?: number;
	/** A workload cap independent of the database's parameter limit. */
	maxItems?: number;
};

/** Calculates an explicit batch size. Callers remain responsible for safe query splitting. */
const getQueryBatchSize = (
	maxQueryParameters: number,
	{ parametersPerItem, reservedParameters = 0, maxItems }: QueryBatchOptions,
): number => {
	if (
		!Number.isSafeInteger(maxQueryParameters) ||
		maxQueryParameters < 1 ||
		!Number.isSafeInteger(parametersPerItem) ||
		parametersPerItem < 1 ||
		!Number.isSafeInteger(reservedParameters) ||
		reservedParameters < 0 ||
		(maxItems !== undefined &&
			(!Number.isSafeInteger(maxItems) || maxItems < 1))
	)
		throw new RangeError(
			"Query batch limits must be positive integers, with nonnegative reserved parameters.",
		);
	const size = Math.floor(
		(maxQueryParameters - reservedParameters) / parametersPerItem,
	);
	if (size < 1)
		throw new RangeError("The query parameter budget cannot fit one item.");
	return Math.min(size, maxItems ?? size);
};

export default getQueryBatchSize;
