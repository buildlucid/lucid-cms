import { DocumentPublishOperationsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices } from "../index.js";
import createEvent from "./helpers/create-event.js";
import { hasCollectionTargetPermission } from "./helpers/index.js";
import notifyPublishOperationUsers from "./notifications.js";

const reject: ServiceFn<
	[
		{
			id: number;
			comment?: string;
			user: LucidAuth;
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

	if (
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
	if (
		collectionRes.data.getData.config.review?.comments.decision ===
			"required" &&
		!comment
	) {
		return {
			error: {
				type: "basic",
				message: T("publish_request_decision_comment_required"),
				status: 400,
			},
			data: undefined,
		};
	}

	const now = new Date().toISOString();
	const updateRes = await Operations.updateSingle({
		where: [{ key: "id", operator: "=", value: operationRes.data.id }],
		data: {
			status: "rejected",
			execution_status: "cancelled",
			decided_by: data.user.id,
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
			type: "rejected",
			userId: data.user.id,
			comment,
			metadata: {},
		},
	});
	if (eventRes.error) return eventRes;

	const requester =
		operationRes.data.requested_by && operationRes.data.requested_by_email
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
		title: T("publish_request_rejected_title"),
		message: T("publish_request_rejected_message", {
			user: data.user.email,
			collection: operationRes.data.collection_key,
			documentId: operationRes.data.document_id,
		}),
		dedupeAction: "rejected",
		comment: {
			label: T("publish_request_email_decision_comment"),
			value: comment,
		},
		details: [
			{
				label: T("publish_request_email_detail_release"),
				value: `#${operationRes.data.id}`,
			},
			{
				label: T("publish_request_email_detail_collection"),
				value: operationRes.data.collection_key,
			},
			{
				label: T("publish_request_email_detail_document"),
				value: `#${operationRes.data.document_id}`,
			},
			{
				label: T("publish_request_email_detail_target"),
				value: operationRes.data.target,
			},
			{
				label: T("publish_request_email_detail_requested_by"),
				value: operationRes.data.requested_by_email,
			},
			{
				label: T("publish_request_email_detail_rejected_by"),
				value: data.user.email,
			},
			{
				label: T("publish_request_email_detail_scheduled_for"),
				value: operationRes.data.scheduled_at,
			},
			{
				label: T("publish_request_email_detail_scheduled_timezone"),
				value: operationRes.data.scheduled_timezone,
			},
		],
	});
	if (notifyRes.error) return notifyRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default reject;
