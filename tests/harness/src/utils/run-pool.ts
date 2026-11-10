/** Runs a task per item with at most `limit` running at once, keeping results in item order. */
const runPool = async <Item, Result>(
	items: readonly Item[],
	limit: number,
	task: (item: Item) => Promise<Result>,
): Promise<Result[]> => {
	const results = new Array<Result>(items.length);
	let next = 0;

	const worker = async () => {
		while (next < items.length) {
			const index = next++;
			results[index] = await task(items[index] as Item);
		}
	};

	await Promise.all(
		Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker),
	);
	return results;
};

export default runPool;
