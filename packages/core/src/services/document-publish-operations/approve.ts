import {
	DocumentPublishOperationEventsRepository,
	DocumentPublishOperationsRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices, documentVersionServices } from "../index.js";
import {
	canUsePublishOperationsForTarget,
	hasCollectionTargetPermission,
} from "./helpers/index.js";
import notifyPublishOperationUsers from "./notifications.js";

const approve: ServiceFn<
	[
		{
			id: number;
			comment?: string;
			user: LucidAuth;
			bypassReviewChecks?: boolean;
			suppressRequesterNotification?: boolean;
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
				message: T("publish_request_target_not_enabled"),
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

	if (
		!bypassReviewChecks &&
		collectionRes.data.getData.config.publishing.review.allowSelfApproval ===
			false &&
		operationRes.data.requested_by === data.user.id
	) {
		return {
			error: {
				type: "basic",
				message: T("publish_request_self_approval_not_allowed"),
				status: 403,
			},
			data: undefined,
		};
	}

	const comment = data.comment?.trim() || null;
	if (
		!bypassReviewChecks &&
		collectionRes.data.getData.config.publishing.review.comments.decision ===
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

	const promoteRes = await documentVersionServices.promoteVersion(context, {
		fromVersionId: operationRes.data.snapshot_version_id,
		toVersionType: operationRes.data.target,
		collectionKey: operationRes.data.collection_key,
		documentId: operationRes.data.document_id,
		userId: data.user.id,
		createRevision: false,
	});
	if (promoteRes.error) return promoteRes;

	const now = new Date().toISOString();
	const updateRes = await Operations.updateSingle({
		where: [{ key: "id", operator: "=", value: operationRes.data.id }],
		data: {
			status: "approved",
			decided_by: data.user.id,
			decision_comment: comment,
			decided_at: now,
			updated_at: now,
		},
	});
	if (updateRes.error) return updateRes;

	const eventRes = await Events.createSingle({
		data: {
			operation_id: operationRes.data.id,
			event_type: "approved",
			user_id: data.user.id,
			comment,
			metadata: {
				target: operationRes.data.target,
			},
		},
	});
	if (eventRes.error) return eventRes;

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
		title: T("publish_request_approved_title"),
		message: T("publish_request_approved_message", {
			user: data.user.email,
			collection: operationRes.data.collection_key,
			documentId: operationRes.data.document_id,
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
