import {
	RequestEventsRepository,
	RequestsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import upsertNotification from "../../notifications/upsert.js";
import {
	failedNotification,
	requestNotificationKeys,
} from "../notifications.js";

/**
 * Records why a publication attempt failed. Call inside a transaction.
 * Polling can record a failure before the job's failure hook adds its
 * diagnostics, so a later call for the same attempt only adds them.
 */
const recordFailure: ServiceFn<
	[
		{
			id: number;
			jobId: string;
			revision: number;
			message: string;
			userId: number | null;
			requestDocumentId?: number | null;
			target?: string | null;
		},
	],
	undefined
> = async (context, data) => {
	const Requests = new RequestsRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);

	const updateRes = await Requests.updateSingle({
		data: {
			failure: data.message,
			failure_request_document_id: data.requestDocumentId ?? null,
			failure_target: data.target ?? null,
			updated_at: new Date().toISOString(),
		},
		where: [
			{ key: "id", operator: "=", value: data.id },
			{ key: "status", operator: "=", value: "open" },
			{ key: "revision", operator: "=", value: data.revision },
			{ key: "execution_job_id", operator: "=", value: data.jobId },
			{
				key:
					data.requestDocumentId != null
						? "failure_request_document_id"
						: "failure",
				operator: "is",
				value: null,
			},
		],
		returning: ["id", "title", "created_by", "scheduled_by"],
	});
	if (updateRes.error) return updateRes;

	const request = updateRes.data;
	if (!request) return { error: undefined, data: undefined };

	const metadata = {
		jobId: data.jobId,
		message: data.message,
		requestDocumentId: data.requestDocumentId ?? undefined,
		target: data.target ?? undefined,
	};
	const previousRes = await RequestEvents.selectLatestFailure({
		requestId: data.id,
	});
	if (previousRes.error) return previousRes;

	if (previousRes.data?.metadata?.jobId === data.jobId) {
		const eventRes = await RequestEvents.updateSingle({
			data: { metadata, updated_at: new Date().toISOString() },
			where: [{ key: "id", operator: "=", value: previousRes.data.id }],
		});
		if (eventRes.error) return eventRes;

		return { error: undefined, data: undefined };
	}

	const eventsRes = await RequestEvents.createEvents({
		data: [
			{
				request_id: data.id,
				user_id: data.userId,
				type: "failed",
				metadata,
			},
		],
	});
	if (eventsRes.error) return eventsRes;

	//* each attempt has its own job, so a later failure refreshes the message and tells people again
	const notifyRes = await upsertNotification(context, {
		definition: failedNotification,
		key: requestNotificationKeys.failed(data.id),
		fingerprint: data.jobId,
		recipients: [request.created_by, request.scheduled_by].filter(
			(userId): userId is number => userId !== null,
		),
		data: { requestId: data.id, title: request.title, message: data.message },
	});
	if (notifyRes.error) return notifyRes;

	return { error: undefined, data: undefined };
};

export default recordFailure;
