import type { Deploy } from "@types";
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
} from "solid-js";

/**
 * The time deploy summaries are worked out from. It ticks each second while a deploy runs, for
 * its elapsed clock and progress ring, and each half minute otherwise, for relative times.
 */
export const useDeployClock = (
	deploys: Accessor<Deploy[]>,
): Accessor<number> => {
	const [now, setNow] = createSignal(Date.now());
	const deploying = createMemo(() =>
		deploys().some((deploy) => deploy.runningRun !== null),
	);

	createEffect(() => {
		const interval = setInterval(
			() => setNow(Date.now()),
			deploying() ? 1_000 : 30_000,
		);
		setNow(Date.now());
		onCleanup(() => clearInterval(interval));
	});

	return now;
};
