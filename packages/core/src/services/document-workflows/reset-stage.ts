import type { CollectionTableNames } from "../../exports/types.js";
import type CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import executeHooks from "../../libs/hooks/execute-hooks.js";
import { DocumentWorkflowsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import recordProposalActivity from "../requests/helpers/record-proposal-activity.js";
import { resolveEffectiveWorkflowStage } from "./helpers/index.js";
import notifyAssignees from "./helpers/notify-assignees.js";

/**
 * Called after latest or a proposal's content changes. A stage with `resetTo`
 * moves back to that stage, so earlier sign-off doesn't carry over to new
 * content. The caller holds the document claim.
 */
const resetStage: ServiceFn<
	[
		{
			collection: CollectionBuilder;
			tableNames: CollectionTableNames;
			documentId: number;
			versionId: number;
			/** Latest or a request proposal. */
			versionType: string;
			userId: number | null;
		},
	],
	undefined
> = async (context, data) => {
	const Workflows = new DocumentWorkflowsRepository(context.db);

	const workflow = data.collection.getData.publishing.workflow;
	if (!workflow?.stages.some((stage) => stage.resetTo !== null)) {
		return { error: undefined, data: undefined };
	}

	//* latest's workflow has no version
	const workflowVersionId =
		data.versionType === "latest" ? null : data.versionId;
	const workflowRes = await Workflows.selectSingleDetailed({
		collectionKey: data.collection.key,
		documentId: data.documentId,
		versionId: workflowVersionId,
	});
	if (workflowRes.error) return workflowRes;

	//* missing workflow rows behave as the initial stage
	const currentStage = resolveEffectiveWorkflowStage({
		collection: data.collection,
		stageKey: workflowRes.data?.stage_key,
	});
	if (!currentStage?.resetTo) return { error: undefined, data: undefined };

	const nextStage = currentStage.resetTo;
	const nextStageConfig = workflow.stages.find(
		(stage) => stage.key === nextStage,
	);
	if (!nextStageConfig) return { error: undefined, data: undefined };

	let workflowId = workflowRes.data?.id;
	if (workflowRes.data) {
		const updateRes = await Workflows.updateSingle({
			where: [{ key: "id", operator: "=", value: workflowRes.data.id }],
			data: {
				stage_key: nextStage,
				updated_by: data.userId,
				updated_at: new Date().toISOString(),
			},
		});
		if (updateRes.error) return updateRes;
	} else {
		const createRes = await Workflows.createSingle({
			data: {
				collection_key: data.collection.key,
				document_id: data.documentId,
				version_id: workflowVersionId,
				stage_key: nextStage,
				created_by: data.userId,
				updated_by: data.userId,
			},
			returning: ["id"],
			validation: { enabled: true },
		});
		if (createRes.error) return createRes;
		workflowId = createRes.data.id;
	}

	if (workflowVersionId !== null) {
		const activityRes = await recordProposalActivity(context, {
			type: "workflow_updated",
			collectionKey: data.collection.key,
			documentId: data.documentId,
			versionId: data.versionId,
			stage: nextStage,
			userId: data.userId,
		});
		if (activityRes.error) return activityRes;
	}

	const assigneeIds =
		workflowRes.data?.assignees.map((assignee) => assignee.user_id) ?? [];
	if (workflowId !== undefined) {
		const notifyRes = await notifyAssignees(context, {
			collection: data.collection,
			tableNames: data.tableNames,
			workflow,
			workflowId,
			documentId: data.documentId,
			versionId: data.versionId,
			versionType: data.versionType,
			stage: nextStageConfig,
			previousStage: currentStage,
			actorUserId: data.userId,
			addedAssigneeIds: [],
			removedAssigneeIds: [],
			keptAssigneeIds: assigneeIds,
		});
		if (notifyRes.error) return notifyRes;
	}

	const hookRes = await executeHooks(
		context,
		{
			service: "documentWorkflows",
			event: "afterUpdate",
			config: context.config,
			collectionInstance: data.collection,
		},
		{
			meta: {
				collection: data.collection,
				collectionKey: data.collection.key,
				userId: data.userId,
				collectionTableNames: data.tableNames,
			},
			data: {
				collectionKey: data.collection.key,
				documentId: data.documentId,
				userId: data.userId,
				versionId: data.versionId,
				previousStage: currentStage.key,
				nextStage,
				previousAssigneeIds: assigneeIds,
				nextAssigneeIds: assigneeIds,
				stageChanged: true,
				assigneesChanged: false,
			},
		},
	);
	if (hookRes.error) return hookRes;

	return { error: undefined, data: undefined };
};

export default resetStage;
