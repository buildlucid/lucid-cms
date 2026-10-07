import {
	DocumentWorkflowAssigneesRepository,
	DocumentWorkflowsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import {
	assignedNotification,
	workflowNotificationKeys,
} from "../../document-workflows/notifications.js";
import resolveNotification from "../../notifications/resolve.js";
import {
	failedNotification,
	readyNotification,
	requestNotificationKeys,
	reviewRequestedNotification,
} from "../notifications.js";
import type { RequestRecord } from "../types.js";

/**
 * Clears every to-do a request created once it closes or publishes: ready,
 * failed, each reviewer's review and the workflow assignments on its
 * proposals. Call before the proposals are removed.
 */
const resolveRequestNotifications: ServiceFn<
	[{ request: Pick<RequestRecord, "id" | "documents" | "reviewers"> }],
	undefined
> = async (context, data) => {
	const Workflows = new DocumentWorkflowsRepository(context.db);
	const Assignees = new DocumentWorkflowAssigneesRepository(context.db);

	const proposals = Map.groupBy(
		data.request.documents.flatMap((document) =>
			document.source_version_id === null
				? []
				: [
						{
							collectionKey: document.collection_key,
							versionId: document.source_version_id,
						},
					],
		),
		(proposal) => proposal.collectionKey,
	);

	const workflowIds: number[] = [];
	for (const [collectionKey, versions] of proposals) {
		const workflowsRes = await Workflows.selectMultiple({
			select: ["id"],
			where: [
				{ key: "collection_key", operator: "=", value: collectionKey },
				{
					key: "version_id",
					operator: "in",
					value: versions.map((version) => version.versionId),
				},
			],
		});
		if (workflowsRes.error) return workflowsRes;
		workflowIds.push(...(workflowsRes.data ?? []).map((row) => row.id));
	}

	const assigneesRes =
		workflowIds.length === 0
			? undefined
			: await Assignees.selectMultiple({
					select: ["workflow_id", "user_id"],
					where: [{ key: "workflow_id", operator: "in", value: workflowIds }],
				});
	if (assigneesRes?.error) return assigneesRes;

	const open = [
		{
			definition: readyNotification,
			key: requestNotificationKeys.ready(data.request.id),
		},
		{
			definition: failedNotification,
			key: requestNotificationKeys.failed(data.request.id),
		},
		...data.request.reviewers.map((reviewer) => ({
			definition: reviewRequestedNotification,
			key: requestNotificationKeys.review(data.request.id, reviewer.user_id),
		})),
		...(assigneesRes?.data ?? []).map((assignee) => ({
			definition: assignedNotification,
			key: workflowNotificationKeys.assigned(
				assignee.workflow_id,
				assignee.user_id,
			),
		})),
	];
	for (const notification of open) {
		const resolveRes = await resolveNotification(context, notification);
		if (resolveRes.error) return resolveRes;
	}

	return { error: undefined, data: undefined };
};

export default resolveRequestNotifications;
