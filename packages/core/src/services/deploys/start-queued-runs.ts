import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import startQueuedRun from "./helpers/start-queued-run.js";

/** Starts any queued run left waiting once its deploy has nothing else starting or running. */
const startQueuedRuns: ServiceFn<[], undefined> = async (context) => {
	for (const deploy of context.config.deploys) {
		const started = await withTransaction(context, (context) =>
			startQueuedRun(context, { deploy }),
		);
		if (started.error) return started;
	}

	return { error: undefined, data: undefined };
};

export default startQueuedRuns;
