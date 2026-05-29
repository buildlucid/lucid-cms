import { text } from "../../libs/i18n/index.js";
import {
	DocumentPublishOperationsRepository,
	QueueJobsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import execute from "./execute.js";
import createEvent from "./helpers/create-event.js";
import {
	isInSchedulingDispatchWindow,
	publishOperationExecuteEvent,
} from "./helpers/index.js";

const scheduleApproved: ServiceFn<
	[
		{
			id: number;
			userId?: number | null;
			eventType?: "scheduled" | "rescheduled" | "retried";
		},
	],
	undefined
> = async (context, data) => {
	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);
	const QueueJobs = new QueueJobsRepository(
		context.db.client,
		context.config.db,
	);

	const operationRes = await Operations.selectSingle({
		select: [
			"id",
			"collection_key",
			"document_id",
			"target",
			"status",
			"scheduled_at",
			"scheduled_timezone",
			"scheduled_job_id",
			"requested_by",
			"decided_by",
		],
		where: [{ key: "id", operator: "=", value: data.id }],
		validation: {
			enabled: true,
			defaultError: {
				message: text.server("core.publish.operations.not.found"),
				status: 404,
			},
		},
	});
	if (operationRes.error) return operationRes;

	if (operationRes.data.status !== "approved") {
		return {
			error: undefined,
			data: undefined,
		};
	}

	if (operationRes.data.scheduled_job_id) {
		await QueueJobs.updateSingle({
			where: [
				{
					key: "job_id",
					operator: "=",
					value: operationRes.data.scheduled_job_id,
				},
			],
			data: {
				status: "cancelled",
				updated_at: new Date().toISOString(),
			},
		});
	}

	const actorUserId =
		data.userId ??
		operationRes.data.decided_by ??
		operationRes.data.requested_by ??
		null;
	const scheduledAt = operationRes.data.scheduled_at
		? new Date(operationRes.data.scheduled_at)
		: null;
	const now = new Date();

	if (scheduledAt && scheduledAt.getTime() > now.getTime()) {
		let scheduledJobId: string | null = null;

		if (isInSchedulingDispatchWindow({ scheduledAt, now })) {
			if (!context.queue.support.scheduling) {
				return {
					error: {
						type: "basic",
						message: text.server(
							"core.publish.operations.schedule.not.supported",
						),
						status: 400,
					},
					data: undefined,
				};
			}

			const queueRes = await context.queue.add(publishOperationExecuteEvent, {
				payload: {
					operationId: operationRes.data.id,
				},
				options: {
					scheduledFor: scheduledAt,
					createdByUserId: actorUserId ?? undefined,
				},
				context,
			});
			if (queueRes.error) return queueRes;
			scheduledJobId = queueRes.data.jobId;
		}

		const updateRes = await Operations.updateSingle({
			where: [{ key: "id", operator: "=", value: operationRes.data.id }],
			data: {
				execution_status: "scheduled",
				scheduled_job_id: scheduledJobId,
				execution_error_message: null,
				execution_error_data: null,
				failed_at: null,
				updated_at: new Date().toISOString(),
			},
		});
		if (updateRes.error) return updateRes;

		const eventRes = await createEvent(context, {
			operation: operationRes.data,
			event: {
				type: data.eventType ?? "scheduled",
				userId: actorUserId,
				comment: null,
				metadata: {
					scheduledAt: scheduledAt.toISOString(),
					scheduledTimezone: operationRes.data.scheduled_timezone,
					scheduledJobId,
				},
			},
		});
		if (eventRes.error) return eventRes;

		return {
			error: undefined,
			data: undefined,
		};
	}

	const clearScheduleRes = await Operations.updateSingle({
		where: [{ key: "id", operator: "=", value: operationRes.data.id }],
		data: {
			scheduled_job_id: null,
			updated_at: new Date().toISOString(),
		},
	});
	if (clearScheduleRes.error) return clearScheduleRes;

	return execute(context, {
		id: operationRes.data.id,
		userId: actorUserId,
		markFailedOnError: true,
	});
};

export default scheduleApproved;
