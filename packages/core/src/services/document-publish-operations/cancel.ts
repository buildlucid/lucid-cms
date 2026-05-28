import { serverText } from "../../libs/i18n/index.js";
import {
	DocumentPublishOperationsRepository,
	QueueJobsRepository,
} from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices } from "../index.js";
import createEvent from "./helpers/create-event.js";
import {
	hasCollectionTargetPermission,
	unresolvedPublishOperationExecutionStatuses,
} from "./helpers/index.js";
import notifyPublishOperationUsers from "./notifications.js";

const cancel: ServiceFn<
	[
		{
			id: number;
			comment?: string;
			user: LucidAuth;
			system?: boolean;
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
				message: serverText("core.publish.requests.not.pending"),
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
	const canAct = hasCollectionTargetPermission({
		user: data.user,
		collection: collectionRes.data,
		action: requiredAction,
		target: operationRes.data.target,
	});
	if (!data.system && !isRequester && !canAct) {
		return {
			error: {
				type: "basic",
				name: serverText("core.collections.permission.error.name"),
				message: serverText("core.collections.permission.error.message", {
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

	const comment = data.comment?.trim() || null;
	const now = new Date().toISOString();
	if (operationRes.data.scheduled_job_id) {
		const cancelJobRes = await QueueJobs.updateSingle({
			where: [
				{
					key: "job_id",
					operator: "=",
					value: operationRes.data.scheduled_job_id,
				},
			],
			data: {
				status: "cancelled",
				updated_at: now,
			},
		});
		if (cancelJobRes.error) return cancelJobRes;
	}

	const updateRes = await Operations.updateSingle({
		where: [{ key: "id", operator: "=", value: operationRes.data.id }],
		data: {
			status: "cancelled",
			execution_status: "cancelled",
			scheduled_job_id: null,
			decided_by: data.system ? null : data.user.id,
			decision_comment: comment,
			decided_at: now,
			updated_at: now,
		},
	});
	if (updateRes.error) return updateRes;

	const eventRes = await createEvent(context, {
		operation: operationRes.data,
		collectionInstance: collectionRes.data,
		event: {
			type: "cancelled",
			userId: data.system ? null : data.user.id,
			comment,
			metadata: {
				system: data.system === true,
			},
		},
	});
	if (eventRes.error) return eventRes;

	const recipients = isRequester
		? operationRes.data.assignees.map((assignee) => ({
				id: assignee.user_id,
				email: assignee.email ?? null,
			}))
		: operationRes.data.requested_by && operationRes.data.requested_by_email
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
		recipients,
		title: serverText("core.publish.requests.cancelled.title"),
		message: serverText("core.publish.requests.cancelled.message", {
			data: {
				collection: operationRes.data.collection_key,
				documentId: operationRes.data.document_id,
			},
		}),
		dedupeAction: "cancelled",
	});
	if (notifyRes.error) return notifyRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default cancel;
