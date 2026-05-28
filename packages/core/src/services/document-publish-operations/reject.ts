import { serverText } from "../../libs/i18n/index.js";
import { DocumentPublishOperationsRepository } from "../../libs/repositories/index.js";
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
				name: serverText("core.collections.permission.error.name"),
				message: serverText("core.collections.permission.error.message", {
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

	const comment = data.comment?.trim() || null;
	if (
		collectionRes.data.getData.config.review?.comments.decision ===
			"required" &&
		!comment
	) {
		return {
			error: {
				type: "basic",
				message: serverText("core.publish.requests.decision.comment.required"),
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
		title: serverText("core.publish.requests.rejected.title"),
		message: serverText("core.publish.requests.rejected.message", {
			data: {
				user: data.user.email,
				collection: operationRes.data.collection_key,
				documentId: operationRes.data.document_id,
			},
		}),
		dedupeAction: "rejected",
		comment: {
			label: serverText("core.publish.requests.email.decision.comment"),
			value: comment,
		},
		details: [
			{
				label: serverText("core.publish.requests.email.detail.release"),
				value: `#${operationRes.data.id}`,
			},
			{
				label: serverText("core.publish.requests.email.detail.collection"),
				value: operationRes.data.collection_key,
			},
			{
				label: serverText("core.publish.requests.email.detail.document"),
				value: `#${operationRes.data.document_id}`,
			},
			{
				label: serverText("core.publish.requests.email.detail.target"),
				value: operationRes.data.target,
			},
			{
				label: serverText("core.publish.requests.email.detail.requested.by"),
				value: operationRes.data.requested_by_email,
			},
			{
				label: serverText("core.publish.requests.email.detail.rejected.by"),
				value: data.user.email,
			},
			{
				label: serverText("core.publish.requests.email.detail.scheduled.for"),
				value: operationRes.data.scheduled_at,
			},
			{
				label: serverText(
					"core.publish.requests.email.detail.scheduled.timezone",
				),
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
