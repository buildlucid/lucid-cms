/**
 * Wraps an adapter so the named methods sometimes fail instead of running.
 * `fail` decides each call, and returns what the method should answer with when it fails.
 *
 * @example
 * ```ts
 * withFaults(inlineQueueAdapter(), {
 * 	methods: ["publish"],
 * 	fail: () => (random() < 0.3 ? { error: { message: "Queue is down" }, data: undefined } : null),
 * });
 * ```
 */
const withFaults = <Adapter extends object, Method extends keyof Adapter>(
	adapter: Adapter,
	options: {
		methods: readonly Method[];
		/** Returns the failed result for this call, or null to let it through. */
		fail: () => Awaited<
			ReturnType<Extract<Adapter[Method], (...args: never[]) => unknown>>
		> | null;
	},
): Adapter => {
	const faulty = { ...adapter };

	for (const method of options.methods) {
		const original = adapter[method];
		if (typeof original !== "function") {
			continue;
		}

		faulty[method] = (async (...args: unknown[]) =>
			options.fail() ?? original.apply(adapter, args)) as Adapter[Method];
	}

	return faulty;
};

export default withFaults;
