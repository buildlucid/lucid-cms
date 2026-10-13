import type z from "zod";
import { copy } from "../../../libs/i18n/index.js";
import type { cmsAgentUsageSchema } from "../../../libs/lucid-remote/schema/ai.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import getRequestDurationMs from "../../ai/helpers/get-request-duration-ms.js";
import reconcileUsage from "../reconcile-usage.js";
import storePendingUsage from "./store-pending-usage.js";
import storeUsage, { type PaidRequestRecord } from "./store-usage.js";

/**
 * Runs one paid Lucid request for an agent run and keeps its usage
 * recoverable. `send` calls `start` with the connection it uses before
 * anything can be charged, which records the request as pending. A success
 * stores its usage. A failure asks the Lucid service what was charged, unless
 * the worker stopped, in which case background reconciliation settles it.
 */
const trackPaidRequest = async <
	Data extends {
		connectionId: number;
		usage: z.infer<typeof cmsAgentUsageSchema>;
	},
>(
	context: ServiceContext,
	props: {
		record: PaidRequestRecord;
		signal: AbortSignal;
		send: (
			start: (connectionId: number) => ServiceResponse<undefined>,
		) => ServiceResponse<Data>;
	},
): ServiceResponse<Data> => {
	const startedAt = Date.now();
	const response = await props.send((connectionId) =>
		storePendingUsage(context, { ...props.record, connectionId }),
	);
	if (response.error) {
		if (!props.signal.aborted) {
			await reconcileUsage(context, {
				requestId: props.record.requestId,
				errorMessage: response.error.message
					? context.translate(response.error.message)
					: undefined,
			});
		}
		return response;
	}

	const stored = await storeUsage(context, {
		...props.record,
		connectionId: response.data.connectionId,
		usage: response.data.usage,
		durationMs: getRequestDurationMs(startedAt),
	});
	if (stored.error) {
		return {
			data: undefined,
			error: {
				...stored.error,
				message: copy("server:agent.usage.store.failed"),
			},
		};
	}

	return response;
};

export default trackPaidRequest;
