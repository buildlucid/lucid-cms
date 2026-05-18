import {
	DocumentPublishOperationsRepository,
	QueueJobsRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices } from "../index.js";
import createEvent from "./helpers/create-event.js";
import notifyPublishOperationUsers from "./notifications.js";

const cancelForDocuments: ServiceFn<
	[
		{
			collectionKey: string;
			documentIds: number[];
			comment: string;
		},
	],
	undefined
> = async (context, data) => {
	if (data.documentIds.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);
	const QueueJobs = new QueueJobsRepository(
		context.db.client,
		context.config.db,
	);

	const activeRes = await Operations.selectMultiple({
		select: ["id", "scheduled_job_id"],
		where: [
			{ key: "collection_key", operator: "=", value: data.collectionKey },
			{ key: "document_id", operator: "in", value: data.documentIds },
			{ key: "status", operator: "in", value: ["pending", "approved"] },
			{
				key: "execution_status",
				operator: "in",
				value: ["awaiting_approval", "scheduled", "executing", "failed"],
			},
		],
	});
	if (activeRes.error) return activeRes;
	const activeOperations = activeRes.data ?? [];
	if (activeOperations.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const ids = activeOperations.map((operation) => operation.id);
	const scheduledJobIds = activeOperations
		.map((operation) => operation.scheduled_job_id)
		.filter((jobId) => jobId !== null);
	const detailedOperations = [];
	for (const id of ids) {
		const detailedRes = await Operations.selectSingleDetailed({
			where: [
				{
					key: "lucid_document_publish_operations.id",
					operator: "=",
					value: id,
				},
			],
		});
		if (detailedRes.error) return detailedRes;
		if (detailedRes.data) detailedOperations.push(detailedRes.data);
	}

	const now = new Date().toISOString();
	if (scheduledJobIds.length > 0) {
		const cancelJobsRes = await QueueJobs.updateSingle({
			where: [{ key: "job_id", operator: "in", value: scheduledJobIds }],
			data: {
				status: "cancelled",
				updated_at: now,
			},
		});
		if (cancelJobsRes.error) return cancelJobsRes;
	}

	const updateRes = await Operations.updateSingle({
		where: [{ key: "id", operator: "in", value: ids }],
		data: {
			status: "cancelled",
			execution_status: "cancelled",
			scheduled_job_id: null,
			decision_comment: data.comment,
			decided_at: now,
			updated_at: now,
		},
	});
	if (updateRes.error) return updateRes;

	const collectionRes = collectionServices.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	for (const operation of detailedOperations) {
		const eventRes = await createEvent(context, {
			operation,
			collectionInstance: collectionRes.data,
			event: {
				type: "cancelled",
				userId: null,
				comment: data.comment,
				metadata: {
					system: true,
				},
			},
		});
		if (eventRes.error) return eventRes;
	}

	for (const operation of detailedOperations) {
		const recipients = [
			...operation.assignees.map((assignee) => ({
				id: assignee.user_id,
				email: assignee.email ?? null,
			})),
			...(operation.requested_by && operation.requested_by_email
				? [
						{
							id: operation.requested_by,
							email: operation.requested_by_email,
						},
					]
				: []),
		];
		const notifyRes = await notifyPublishOperationUsers(context, {
			operationId: operation.id,
			collectionKey: operation.collection_key,
			documentId: operation.document_id,
			recipients,
			title: T("publish_request_cancelled_title"),
			message: T("publish_request_cancelled_for_target_message", {
				collection: operation.collection_key,
				documentId: operation.document_id,
				target: operation.target,
				comment: data.comment,
			}),
			dedupeAction: "cancelled",
		});
		if (notifyRes.error) return notifyRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default cancelForDocuments;
