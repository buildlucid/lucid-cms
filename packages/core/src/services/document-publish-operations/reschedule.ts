import { copy } from "../../libs/i18n/index.js";
import { DocumentPublishOperationsRepository } from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices } from "../index.js";
import createEvent from "./helpers/create-event.js";
import {
	collectionTargetSupportsScheduling,
	hasCollectionPermission,
	parseScheduleInput,
	unresolvedPublishOperationExecutionStatuses,
} from "./helpers/index.js";
import scheduleApproved from "./schedule-approved.js";

const reschedule: ServiceFn<
	[
		{
			id: number;
			scheduledAt: string | null;
			scheduledTimezone: string | null;
			user: LucidAuth;
		},
	],
	undefined
> = async (context, data) => {
	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);
	const scheduleInput = parseScheduleInput({
		scheduledAt: data.scheduledAt,
		scheduledTimezone: data.scheduledTimezone,
	});
	if (scheduleInput.error) {
		return {
			error: scheduleInput.error,
			data: undefined,
		};
	}
	const schedule = scheduleInput.data;

	const operationRes = await Operations.selectSingleDetailed({
		tenantKey: context.request.tenantKey,
		where: [
			{
				key: "lucid_document_publish_operations.id",
				operator: "=",
				value: data.id,
			},
		],
	});
	if (operationRes.error) return operationRes;
	if (
		!operationRes.data ||
		!["pending", "approved"].includes(operationRes.data.status) ||
		!unresolvedPublishOperationExecutionStatuses.some(
			(status) => status === operationRes.data?.execution_status,
		)
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.publish.operations.not.reschedulable"),
				status: 400,
			},
			data: undefined,
		};
	}

	const collectionRes = collectionServices.getSingleInstance(context, {
		key: operationRes.data.collection_key,
	});
	if (collectionRes.error) return collectionRes;

	const isRequester = operationRes.data.requested_by === data.user.id;
	const requiredAction =
		operationRes.data.status === "approved" &&
		operationRes.data.operation_type === "direct"
			? "publish"
			: "review";
	const canAct = hasCollectionPermission({
		user: data.user,
		collection: collectionRes.data,
		action: requiredAction,
	});
	if (operationRes.data.status === "pending" && !isRequester && !canAct) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.collections.permission.error.name"),
				message: copy("server:core.collections.permission.error.message", {
					data: {
						collection: operationRes.data.collection_key,
						action: "review",
					},
				}),
				status: 403,
			},
			data: undefined,
		};
	}
	if (operationRes.data.status === "approved" && !canAct) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.collections.permission.error.name"),
				message: copy("server:core.collections.permission.error.message", {
					data: {
						collection: operationRes.data.collection_key,
						action: requiredAction,
					},
				}),
				status: 403,
			},
			data: undefined,
		};
	}

	if (
		schedule?.scheduledAt &&
		!collectionTargetSupportsScheduling({
			collection: collectionRes.data,
			target: operationRes.data.target,
			queueSupportsScheduling: context.queue.support.scheduling,
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.publish.operations.schedule.not.supported"),
				status: 400,
			},
			data: undefined,
		};
	}

	const now = new Date().toISOString();
	const updateRes = await Operations.updateSingle({
		where: [{ key: "id", operator: "=", value: operationRes.data.id }],
		data: {
			scheduled_at: schedule?.scheduledAt ?? null,
			scheduled_timezone: schedule?.scheduledTimezone ?? null,
			...(operationRes.data.status === "pending"
				? { execution_status: "awaiting_approval" as const }
				: {}),
			updated_at: now,
		},
	});
	if (updateRes.error) return updateRes;

	if (operationRes.data.status === "approved") {
		return scheduleApproved(context, {
			id: operationRes.data.id,
			userId: data.user.id,
			eventType: "rescheduled",
		});
	}

	const eventRes = await createEvent(context, {
		operation: operationRes.data,
		collectionInstance: collectionRes.data,
		event: {
			type: "rescheduled",
			userId: data.user.id,
			comment: null,
			metadata: {
				scheduledAt: schedule?.scheduledAt ?? null,
				scheduledTimezone: schedule?.scheduledTimezone ?? null,
			},
		},
	});
	if (eventRes.error) return eventRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default reschedule;
