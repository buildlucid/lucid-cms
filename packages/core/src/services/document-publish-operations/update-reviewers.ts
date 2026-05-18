import {
	DocumentPublishOperationAssigneesRepository,
	DocumentPublishOperationEventsRepository,
	DocumentPublishOperationsRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices } from "../index.js";
import getReviewers from "./get-reviewers.js";
import { hasCollectionTargetPermission } from "./helpers/index.js";

const updateReviewers: ServiceFn<
	[
		{
			id: number;
			assigneeIds?: number[];
			user: LucidAuth;
		},
	],
	undefined
> = async (context, data) => {
	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);
	const Assignees = new DocumentPublishOperationAssigneesRepository(
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
	if (
		!operationRes.data ||
		operationRes.data.operation_type !== "request" ||
		operationRes.data.status !== "pending"
	) {
		return {
			error: {
				type: "basic",
				message: T("publish_request_not_pending"),
				status: 400,
			},
			data: undefined,
		};
	}
	const operation = operationRes.data;

	const collectionRes = collectionServices.getSingleInstance(context, {
		key: operation.collection_key,
	});
	if (collectionRes.error) return collectionRes;

	const isRequester = operation.requested_by === data.user.id;
	const canReview = hasCollectionTargetPermission({
		user: data.user,
		collection: collectionRes.data,
		action: "review",
		target: operation.target,
	});
	if (!isRequester && !canReview && !data.user.superAdmin) {
		return {
			error: {
				type: "basic",
				name: T("collection_permission_error_name"),
				message: T("collection_permission_error_message", {
					collection: operation.collection_key,
					action: "review",
				}),
				status: 403,
			},
			data: undefined,
		};
	}

	const assigneeIds = Array.from(new Set(data.assigneeIds ?? []));
	const reviewersRes = await getReviewers(context, {
		collectionKey: operation.collection_key,
		target: operation.target,
	});
	if (reviewersRes.error) return reviewersRes;

	const reviewerIds = new Set(reviewersRes.data.map((reviewer) => reviewer.id));
	const invalidAssignee = assigneeIds.find((id) => !reviewerIds.has(id));
	if (invalidAssignee !== undefined) {
		return {
			error: {
				type: "basic",
				message: T("publish_request_invalid_assignees"),
				status: 400,
			},
			data: undefined,
		};
	}

	const now = new Date().toISOString();
	const deleteRes = await Assignees.deleteMultiple({
		where: [{ key: "operation_id", operator: "=", value: operation.id }],
	});
	if (deleteRes.error) return deleteRes;

	if (assigneeIds.length > 0) {
		const createRes = await Assignees.createMultiple({
			data: assigneeIds.map((userId) => ({
				operation_id: operation.id,
				user_id: userId,
				assigned_by: data.user.id,
				assigned_at: now,
			})),
		});
		if (createRes.error) return createRes;
	}

	const updateRes = await Operations.updateSingle({
		where: [{ key: "id", operator: "=", value: operation.id }],
		data: {
			updated_at: now,
		},
	});
	if (updateRes.error) return updateRes;

	const eventRes = await Events.createSingle({
		data: {
			operation_id: operation.id,
			event_type: "reviewers_updated",
			user_id: data.user.id,
			comment: null,
			metadata: {
				assigneeIds,
			},
		},
	});
	if (eventRes.error) return eventRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateReviewers;
