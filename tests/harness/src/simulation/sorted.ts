/** IDs in ascending order, for comparing what the CMS lists with what the model holds. */
const sorted = (ids: readonly number[]): number[] =>
	ids.toSorted((a, b) => a - b);

export default sorted;
