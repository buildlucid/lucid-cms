import {
	DocumentPublishOperationEventsRepository,
	DocumentPublishOperationsRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices } from "../index.js";
import { hasCollectionTargetPermission } from "./helpers/index.js";
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
	const Events = new DocumentPublishOperationEventsRepository(
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
				message: T("publish_request_not_pending"),
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
	const canReview = hasCollectionTargetPermission({
		user: data.user,
		collection: collectionRes.data,
		action: "review",
		target: operationRes.data.target,
	});
	if (!data.system && !isRequester && !canReview) {
		return {
			error: {
				type: "basic",
				name: T("collection_permission_error_name"),
				message: T("collection_permission_error_message", {
					collection: operationRes.data.collection_key,
					action: "review",
				}),
				status: 403,
			},
			data: undefined,
		};
	}

	const comment = data.comment?.trim() || null;
	const now = new Date().toISOString();
	const updateRes = await Operations.updateSingle({
		where: [{ key: "id", operator: "=", value: operationRes.data.id }],
		data: {
			status: "cancelled",
			decided_by: data.system ? null : data.user.id,
			decision_comment: comment,
			decided_at: now,
			updated_at: now,
		},
	});
	if (updateRes.error) return updateRes;

	const eventRes = await Events.createSingle({
		data: {
			operation_id: operationRes.data.id,
			event_type: "cancelled",
			user_id: data.system ? null : data.user.id,
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
		title: T("publish_request_cancelled_title"),
		message: T("publish_request_cancelled_message", {
			collection: operationRes.data.collection_key,
			documentId: operationRes.data.document_id,
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
