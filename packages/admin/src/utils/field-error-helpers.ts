/**
 * Returns the first array index whose value changed between two selections so
 * indexed field errors can be cleared from that point onward.
 */
export const getChangedItemErrorStartIndex = <T>(
	previousValue: T[] | null | undefined,
	nextValue: T[] | null | undefined,
	isEqual: (left: T | undefined, right: T | undefined) => boolean,
): number | undefined => {
	const previousItems = previousValue ?? [];
	const nextItems = nextValue ?? [];
	const compareLength = Math.max(previousItems.length, nextItems.length);

	for (let itemIndex = 0; itemIndex < compareLength; itemIndex++) {
		if (!isEqual(previousItems[itemIndex], nextItems[itemIndex])) {
			return itemIndex;
		}
	}

	return undefined;
};
