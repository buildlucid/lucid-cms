import { DocumentPublishOperationsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { schedulingDispatchWindowMs } from "../document-publish-operations/helpers/index.js";
import scheduleApproved from "../document-publish-operations/schedule-approved.js";

const dispatchScheduledPublishOperations: ServiceFn<[], undefined> = async (
	context,
) => {
	if (!context.queue.support.scheduling) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);
	const dispatchBefore = new Date(
		Date.now() + schedulingDispatchWindowMs,
	).toISOString();

	const operationsRes = await Operations.selectMultiple({
		select: ["id"],
		where: [
			{ key: "status", operator: "=", value: "approved" },
			{ key: "execution_status", operator: "=", value: "scheduled" },
			{ key: "scheduled_job_id", operator: "is", value: null },
			{ key: "scheduled_at", operator: "<=", value: dispatchBefore },
		],
	});
	if (operationsRes.error) return operationsRes;

	const scheduleResults = await Promise.all(
		(operationsRes.data ?? []).map((operation) =>
			scheduleApproved(context, {
				id: operation.id,
				eventType: "scheduled",
			}),
		),
	);

	for (const scheduleRes of scheduleResults) {
		if (scheduleRes.error) return scheduleRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default dispatchScheduledPublishOperations;
