/**
 * Collects abort sources into one deduplicated list so the transport can compose them safely.
 */
export const collectAbortSignals = (
	...signals: Array<AbortSignal | null | undefined>
): AbortSignal[] => {
	const filteredSignals = signals.filter(
		(signal): signal is AbortSignal => signal !== undefined && signal !== null,
	);

	return filteredSignals.filter(
		(signal, index) => filteredSignals.indexOf(signal) === index,
	);
};

/**
 * Forwards any abort source into a single controller and returns cleanup hooks for listener teardown.
 */
export const forwardAbortSignals = (
	controller: AbortController,
	signals: AbortSignal[],
): (() => void) => {
	const cleanupCallbacks: Array<() => void> = [];

	for (const signal of signals) {
		if (signal.aborted) {
			controller.abort(signal.reason);
			return () => {
				for (const cleanup of cleanupCallbacks) cleanup();
			};
		}

		const abort = () => controller.abort(signal.reason);
		signal.addEventListener("abort", abort, { once: true });
		cleanupCallbacks.push(() => {
			signal.removeEventListener("abort", abort);
		});
	}

	return () => {
		for (const cleanup of cleanupCallbacks) cleanup();
	};
};
