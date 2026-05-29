import { copy } from "../../libs/i18n/index.js";
import { DocumentPublishOperationsRepository } from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices } from "../index.js";
import createEvent from "./helpers/create-event.js";
import {
	canUsePublishOperationsForTarget,
	collectionTargetSupportsScheduling,
	hasCollectionTargetPermission,
	parseScheduleInput,
} from "./helpers/index.js";
import notifyPublishOperationUsers from "./notifications.js";
import scheduleApproved from "./schedule-approved.js";

const approve: ServiceFn<
	[
		{
			id: number;
			comment?: string;
			user: LucidAuth;
			bypassReviewChecks?: boolean;
			suppressRequesterNotification?: boolean;
			scheduledAt?: string | null;
			scheduledTimezone?: string | null;
		},
	],
	undefined
> = async (context, data) => {
	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);
	const operationRes = await Operations.selectSingleDetailed({
		where: [
			{
				key: "lucid_document_publish_operations.id",
				operator: "=",
				value: data.id,
			},
		],
	});
	if (operationRes.error) return operationRes;
	if (!operationRes.data || operationRes.data.status !== "pending") {
		return {
			error: {
				type: "basic",
				message: copy("server:core.publish.requests.not.pending"),
				status: 400,
			},
			data: undefined,
		};
	}

	const collectionRes = collectionServices.getSingleInstance(context, {
		key: operationRes.data.collection_key,
	});
	if (collectionRes.error) return collectionRes;

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

	const bypassReviewChecks = data.bypassReviewChecks === true;
	if (
		!bypassReviewChecks &&
		!canUsePublishOperationsForTarget({
			collection: collectionRes.data,
			target: operationRes.data.target,
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.publish.requests.target.not.enabled"),
				status: 400,
			},
			data: undefined,
		};
	}

	if (
		!bypassReviewChecks &&
		!hasCollectionTargetPermission({
			user: data.user,
			collection: collectionRes.data,
			action: "review",
			target: operationRes.data.target,
		})
	) {
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

	if (
		!bypassReviewChecks &&
		collectionRes.data.getData.config.review?.allowSelfApproval === false &&
		operationRes.data.requested_by === data.user.id
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.publish.requests.self.approval.not.allowed"),
				status: 403,
			},
			data: undefined,
		};
	}

	const comment = data.comment?.trim() || null;
	if (
		!bypassReviewChecks &&
		collectionRes.data.getData.config.review?.comments.decision ===
			"required" &&
		!comment
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.publish.requests.decision.comment.required"),
				status: 400,
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
	const scheduleUpdate =
		schedule?.provided === true
			? {
					scheduled_at: schedule.scheduledAt,
					scheduled_timezone: schedule.scheduledTimezone,
				}
			: {};
	const updateRes = await Operations.updateSingle({
		where: [{ key: "id", operator: "=", value: operationRes.data.id }],
		data: {
			status: "approved",
			decided_by: data.user.id,
			decision_comment: comment,
			decided_at: now,
			...scheduleUpdate,
			updated_at: now,
		},
	});
	if (updateRes.error) return updateRes;

	const eventRes = await createEvent(context, {
		operation: operationRes.data,
		collectionInstance: collectionRes.data,
		event: {
			type: "approved",
			userId: data.user.id,
			comment,
			metadata: {
				target: operationRes.data.target,
			},
		},
	});
	if (eventRes.error) return eventRes;

	const scheduleRes = await scheduleApproved(context, {
		id: operationRes.data.id,
		userId: data.user.id,
		eventType: "scheduled",
	});
	if (scheduleRes.error) return scheduleRes;

	const requester =
		data.suppressRequesterNotification !== true &&
		operationRes.data.requested_by &&
		operationRes.data.requested_by_email
			? [
					{
						id: operationRes.data.requested_by,
						email: operationRes.data.requested_by_email,
					},
				]
			: [];
	const notifyRes = await notifyPublishOperationUsers(context, {
		operationId: operationRes.data.id,
		collectionKey: operationRes.data.collection_key,
		documentId: operationRes.data.document_id,
		recipients: requester,
		title: copy("server:core.publish.requests.approved.title"),
		message: copy("server:core.publish.requests.approved.message", {
			data: {
				user: data.user.email,
				collection: operationRes.data.collection_key,
				documentId: operationRes.data.document_id,
			},
		}),
		dedupeAction: "approved",
	});
	if (notifyRes.error) return notifyRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default approve;
