import { createJobPool } from "@lucidcms/core/extension";
import type { createLucidHost } from "@lucidcms/core/runtime";
import type {
	LucidInvocation,
	QueueAdapterInstance,
} from "@lucidcms/core/types";

type LucidHost = Awaited<ReturnType<typeof createLucidHost>>;

/** The worker queue's key, which jobs are stored with. */
export const WORKER_QUEUE_KEY = "worker";

/** How often it looks for ready jobs, such as delayed ones, without being told to. */
const POLL_INTERVAL_MS = 100;

/**
 * Host-mode stand-in for the worker queue, with the same key, as there is no build to start the
 * worker thread from. It runs jobs in the test process through the same job pool as the built
 * consumer, so jobs on setups with the worker queue run in the background in both modes. Polls
 * when idle, on publication and after completion. Uses real timers because `advanceClock` only
 * changes `Date`.
 */
const createHostWorkerQueue = () => {
	let invocation: LucidInvocation | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let polling: Promise<void> | undefined;
	let again = false;
	let stopped = false;

	const pool = createJobPool({
		maxConcurrentJobs: 5,
		batchSize: 10,
		onSettled: () => check(),
	});

	/** Polls now, or once the poll in progress ends, then again after the interval. */
	const check = () => {
		if (stopped || !invocation) {
			return;
		}
		if (polling) {
			again = true;
			return;
		}
		clearTimeout(timer);
		const current = invocation;
		polling = (async () => {
			await pool.fill(await current.getServiceContext());
		})()
			.catch(() => undefined)
			.finally(() => {
				polling = undefined;
				if (again) {
					again = false;
					check();
				} else if (!stopped) {
					timer = setTimeout(check, POLL_INTERVAL_MS);
				}
			});
	};

	const adapter: QueueAdapterInstance = {
		type: "queue-adapter",
		key: WORKER_QUEUE_KEY,
		support: { delayedDelivery: true, maxDelayMs: null },
		publish: async () => {
			check();
			return { error: undefined, data: undefined };
		},
	};

	return {
		adapter,
		/** Starts running the host's jobs, in one invocation that lasts until `stop`. */
		start: (host: LucidHost) => {
			invocation = host.createInvocation({ env: host.env });
			check();
		},
		/** Stops polling and waits for running jobs. Call it before the host is destroyed. */
		stop: async () => {
			stopped = true;
			clearTimeout(timer);
			await polling;
			await pool.settle();
			await invocation?.destroy();
		},
	};
};

export default createHostWorkerQueue;
