import { onCleanup } from "solid-js";

export type PollingLoopResult<TItem> =
	| {
			type: "complete";
	  }
	| {
			type: "continue";
			item: TItem;
			delay: number;
	  };

type PollingLoopOptions<TItem> = {
	poll: (item: TItem, signal: AbortSignal) => Promise<PollingLoopResult<TItem>>;
	onStart?: (item: TItem) => void;
	onContinue?: (item: TItem) => void;
	onStop?: (item?: TItem) => void;
	onError?: (error: unknown, item: TItem) => void;
};

export function usePollingLoop<TItem>(options: PollingLoopOptions<TItem>) {
	let active = false;
	let activeItem: TItem | undefined;
	let timeout: ReturnType<typeof setTimeout> | undefined;
	let abortController: AbortController | undefined;

	const clearTimer = () => {
		if (!timeout) return;
		clearTimeout(timeout);
		timeout = undefined;
	};

	const stop = () => {
		if (!active && activeItem === undefined && !timeout && !abortController) {
			return;
		}

		const stoppedItem = activeItem;
		active = false;
		activeItem = undefined;
		clearTimer();
		abortController?.abort();
		abortController = undefined;
		options.onStop?.(stoppedItem);
	};

	const run = async (item: TItem) => {
		if (!active) return;

		const currentAbortController = new AbortController();
		abortController = currentAbortController;

		try {
			const result = await options.poll(item, currentAbortController.signal);
			if (!active || currentAbortController.signal.aborted) return;

			if (result.type === "complete") {
				stop();
				return;
			}

			activeItem = result.item;
			options.onContinue?.(result.item);
			timeout = setTimeout(() => {
				timeout = undefined;
				void run(result.item);
			}, result.delay);
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") {
				return;
			}

			options.onError?.(error, item);
			stop();
		} finally {
			if (abortController === currentAbortController) {
				abortController = undefined;
			}
		}
	};

	const start = (item: TItem, delay = 0) => {
		stop();
		active = true;
		activeItem = item;
		options.onStart?.(item);
		timeout = setTimeout(() => {
			timeout = undefined;
			void run(item);
		}, delay);
	};

	onCleanup(stop);

	return {
		start,
		stop,
		isActive: () => active,
		getActiveItem: () => activeItem,
	};
}
