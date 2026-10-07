import {
	DocumentWorkflowAssigneesRepository,
	DocumentWorkflowsRepository,
	NotificationsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { assignedNotification } from "../../document-workflows/notifications/assigned.js";
import { workflowNotificationKeys } from "../../document-workflows/notifications/keys.js";
import resolveNotification from "../../notifications/resolve.js";
import upsertNotification from "../../notifications/upsert.js";
import type { RequestDocumentRecord } from "../types.js";

/**
 * Called once a request lands its proposal in latest. The proposal's workflow
 * becomes latest's, keeping the approved stage and assignees, so latest's
 * stage always describes its content. Latest's previous workflow is removed
 * and its assignees' to-dos cleared, while the proposal's open to-dos are
 * pointed at the document instead of the completed request. A proposal
 * without a workflow leaves latest at the initial stage. Call before the
 * proposal is removed.
 */
const landProposalWorkflow: ServiceFn<
	[{ document: RequestDocumentRecord }],
	undefined
> = async (context, data) => {
	const Workflows = new DocumentWorkflowsRepository(context.db);
	const Assignees = new DocumentWorkflowAssigneesRepository(context.db);
	const Notifications = new NotificationsRepository(context.db);

	if (data.document.source_version_id === null) {
		return { error: undefined, data: undefined };
	}

	const latestRes = await Workflows.selectSingle({
		select: ["id"],
		where: [
			{
				key: "collection_key",
				operator: "=",
				value: data.document.collection_key,
			},
			{ key: "document_id", operator: "=", value: data.document.document_id },
			{ key: "version_id", operator: "is", value: null },
		],
	});
	if (latestRes.error) return latestRes;

	if (latestRes.data) {
		const workflowId = latestRes.data.id;
		const assigneesRes = await Assignees.selectMultiple({
			select: ["user_id"],
			where: [{ key: "workflow_id", operator: "=", value: workflowId }],
		});
		if (assigneesRes.error) return assigneesRes;

		for (const assignee of assigneesRes.data ?? []) {
			const resolveRes = await resolveNotification(context, {
				definition: assignedNotification,
				key: workflowNotificationKeys.assigned(workflowId, assignee.user_id),
			});
			if (resolveRes.error) return resolveRes;
		}

		const deleteRes = await Workflows.deleteSingle({
			where: [{ key: "id", operator: "=", value: workflowId }],
		});
		if (deleteRes.error) return deleteRes;
	}

	const workflowRes = await Workflows.updateSingle({
		data: { version_id: null },
		returning: ["id"],
		where: [
			{
				key: "collection_key",
				operator: "=",
				value: data.document.collection_key,
			},
			{
				key: "version_id",
				operator: "=",
				value: data.document.source_version_id,
			},
		],
	});
	if (workflowRes.error) return workflowRes;
	if (!workflowRes.data) return { error: undefined, data: undefined };

	const workflowId = workflowRes.data.id;
	const assigneesRes = await Assignees.selectMultiple({
		select: ["user_id"],
		where: [{ key: "workflow_id", operator: "=", value: workflowId }],
	});
	if (assigneesRes.error) return assigneesRes;

	const keys = new Map(
		(assigneesRes.data ?? []).map((assignee) => [
			workflowNotificationKeys.assigned(workflowId, assignee.user_id),
			assignee.user_id,
		]),
	);
	if (keys.size === 0) return { error: undefined, data: undefined };

	//* only open to-dos are refreshed, as upserting would reopen resolved ones
	const openRes = await Notifications.selectMultiple({
		select: ["key", "data"],
		where: [
			{ key: "type", operator: "=", value: assignedNotification.key },
			{ key: "key", operator: "in", value: [...keys.keys()] },
			{ key: "resolved_at", operator: "is", value: null },
		],
	});
	if (openRes.error) return openRes;

	for (const notification of openRes.data ?? []) {
		const userId = notification.key ? keys.get(notification.key) : undefined;
		const parsed = assignedNotification.data.safeParse(notification.data);
		if (!notification.key || userId === undefined || !parsed.success) continue;

		const upsertRes = await upsertNotification(context, {
			definition: assignedNotification,
			key: notification.key,
			data: { ...parsed.data, requestId: null },
			recipients: [userId],
		});
		if (upsertRes.error) return upsertRes;
	}

	return { error: undefined, data: undefined };
};

export default landProposalWorkflow;
