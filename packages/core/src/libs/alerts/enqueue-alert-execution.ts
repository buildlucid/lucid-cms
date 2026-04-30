import type { ServiceFn } from "../../utils/services/types.js";
import type { AlertExecutionPayload } from "./types.js";

/**
 * Queues one alert producer without delaying user-facing request paths.
 */
const enqueueAlertExecution: ServiceFn<
	[AlertExecutionPayload],
	undefined
> = async (context, data) => {
	try {
		const queueRes = await context.queue.add("alert:execute", {
			payload: {
				key: data.key,
				source: data.source ?? "programmatic",
				trigger: data.trigger,
				metadata: data.metadata ?? {},
			},
			context,
		});
		if (queueRes.error) return queueRes;
	} catch {
		//* Alert executions are best-effort from user-facing failure paths.
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default enqueueAlertExecution;
