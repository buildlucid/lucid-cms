/**
 * Compares numeric arrays as sets so reordered IDs do not count as changes.
 */
const sameNumericSet = (left: number[], right: number[]) => {
	if (left.length !== right.length) return false;
	const rightSet = new Set(right);
	return left.every((value) => rightSet.has(value));
};

export default sameNumericSet;
