/** Runs a task for each item, with at most `limit` running at once. */
const eachLimited = async <Item>(
	items: Item[],
	limit: number,
	task: (item: Item) => Promise<void>,
) => {
	const queue = [...items];
	await Promise.all(
		Array.from({ length: Math.min(limit, queue.length) }, async () => {
			for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
				await task(item);
			}
		}),
	);
};

export default eachLimited;
