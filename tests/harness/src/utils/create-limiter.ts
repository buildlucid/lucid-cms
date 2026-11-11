/**
 * Lets at most `limit` tasks run at once. When a slot frees, the waiting task with the highest
 * priority takes it, and tasks of equal priority go in the order they asked.
 *
 * @example
 * ```ts
 * const slots = createLimiter(4);
 * await Promise.all(jobs.map((job) => slots(() => run(job), job.expectedMs)));
 * ```
 */
const createLimiter = (limit: number) => {
	let active = 0;
	const waiting: Array<{ priority: number; start: () => void }> = [];

	return async <Result>(
		task: () => Promise<Result>,
		priority = 0,
	): Promise<Result> => {
		if (active >= limit) {
			await new Promise<void>((start) => {
				//* placed after every task of the same or higher priority
				const index = waiting.findIndex((entry) => entry.priority < priority);
				waiting.splice(index === -1 ? waiting.length : index, 0, {
					priority,
					start,
				});
			});
		}
		active++;
		try {
			return await task();
		} finally {
			active--;
			waiting.shift()?.start();
		}
	};
};

export type Limiter = ReturnType<typeof createLimiter>;

export default createLimiter;
