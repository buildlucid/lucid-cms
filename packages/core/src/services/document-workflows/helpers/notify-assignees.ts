import type { CollectionTableNames } from "../../../exports/types.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type {
	PublishingWorkflowConfig,
	PublishingWorkflowStageConfig,
} from "../../../libs/collection/builders/collection-builder/types.js";
import {
	DocumentBricksRepository,
	RequestDocumentsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getDocumentLabel from "../../documents/helpers/get-document-label.js";
import resolveNotification from "../../notifications/resolve.js";
import sendNotification from "../../notifications/send.js";
import { assignedNotification } from "../notifications/assigned.js";
import { workflowNotificationKeys } from "../notifications/keys.js";
import { stageChangedNotification } from "../notifications/stage-changed.js";

/**
 * Keeps assignees' to-dos in step with the workflow. New assignees are told
 * about their document and people taken off it have their to-do cleared.
 * Reaching the last stage clears everyone's to-do, and leaving it gives them
 * back. Assignees who stay on are told when the stage changes.
 */
const notifyAssignees: ServiceFn<
	[
		{
			collection: CollectionBuilder;
			tableNames: CollectionTableNames;
			workflow: PublishingWorkflowConfig;
			workflowId: number;
			documentId: number;
			versionId: number;
			/** Latest or a request proposal. */
			versionType: string;
			stage: PublishingWorkflowStageConfig;
			previousStage: PublishingWorkflowStageConfig;
			actorUserId: number | null;
			addedAssigneeIds: number[];
			removedAssigneeIds: number[];
			keptAssigneeIds: number[];
		},
	],
	undefined
> = async (context, data) => {
	const stageChanged = data.stage.key !== data.previousStage.key;
	if (
		!stageChanged &&
		data.addedAssigneeIds.length === 0 &&
		data.removedAssigneeIds.length === 0
	) {
		return { error: undefined, data: undefined };
	}

	const finalStageKey = data.workflow.stages.at(-1)?.key;
	const final = data.stage.key === finalStageKey;
	const wasFinal = data.previousStage.key === finalStageKey;

	const resolveIds = final
		? [
				...data.removedAssigneeIds,
				...data.addedAssigneeIds,
				...data.keptAssigneeIds,
			]
		: data.removedAssigneeIds;
	const assignIds = final
		? []
		: wasFinal
			? [...data.addedAssigneeIds, ...data.keptAssigneeIds]
			: data.addedAssigneeIds;
	//* people given their to-do back already hear about it, so they skip the stage change
	const stageChangeIds =
		stageChanged && !(wasFinal && !final) ? data.keptAssigneeIds : [];

	for (const userId of resolveIds) {
		const resolveRes = await resolveNotification(context, {
			definition: assignedNotification,
			key: workflowNotificationKeys.assigned(data.workflowId, userId),
		});
		if (resolveRes.error) return resolveRes;
	}
	if (assignIds.length === 0 && stageChangeIds.length === 0) {
		return { error: undefined, data: undefined };
	}

	const DocumentBricks = new DocumentBricksRepository(context.db);
	const RequestDocuments = new RequestDocumentsRepository(context.db);

	const labelRes = await getDocumentLabel({
		context,
		bricks: DocumentBricks,
		collection: data.collection,
		tables: data.tableNames,
		documentId: data.documentId,
		versionId: data.versionId,
	});
	if (labelRes.error) return labelRes;

	const requestRes =
		data.versionType === "latest"
			? undefined
			: await RequestDocuments.selectOpenForVersion({
					collectionKey: data.collection.key,
					documentId: data.documentId,
					versionId: data.versionId,
				});
	if (requestRes?.error) return requestRes;

	const document = {
		collectionKey: data.collection.key,
		documentId: data.documentId,
		requestId: requestRes?.data?.request_id ?? null,
		label: labelRes.data,
		stage: context.translate(data.stage.label),
	};

	for (const userId of assignIds) {
		const sendRes = await sendNotification(context, {
			definition: assignedNotification,
			key: workflowNotificationKeys.assigned(data.workflowId, userId),
			recipients: [userId],
			actorUserId: data.actorUserId,
			data: document,
		});
		if (sendRes.error) return sendRes;
	}

	if (stageChangeIds.length > 0) {
		const sendRes = await sendNotification(context, {
			definition: stageChangedNotification,
			recipients: stageChangeIds,
			actorUserId: data.actorUserId,
			data: {
				...document,
				previousStage: context.translate(data.previousStage.label),
			},
		});
		if (sendRes.error) return sendRes;
	}

	return { error: undefined, data: undefined };
};

export default notifyAssignees;
