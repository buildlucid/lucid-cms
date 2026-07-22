import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import executeHooks from "../../libs/hooks/execute-hooks.js";
import { copy } from "../../libs/i18n/index.js";
import { resolveCollectionPermission } from "../../libs/permission/collection-permissions.js";
import {
	DocumentWorkflowAssigneesRepository,
	DocumentWorkflowsRepository,
	UsersRepository,
} from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import { sameNumericSet } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getCollectionInstance from "../collections/get-single-instance.js";
import { documentServices } from "../index.js";
import {
	getWorkflowConfig,
	resolveEffectiveWorkflowStage,
} from "./helpers/index.js";

const updateSingle: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			stage?: string;
			assigneeIds?: number[];
			user: LucidAuth;
		},
	],
	undefined
> = async (context, data) => {
	const collectionRes = getCollectionInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const workflow = getWorkflowConfig(collectionRes.data);
	if (!workflow) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.workflows.not.enabled"),
				status: 400,
			},
			data: undefined,
		};
	}

	// Stage changes are optional, but provided stage keys must exist in config.
	const targetStage = data.stage
		? workflow.stages.find((stage) => stage.key === data.stage)
		: undefined;
	if (data.stage !== undefined && !targetStage) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.workflows.stage.not.found"),
				status: 400,
			},
			data: undefined,
		};
	}

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const documentAccessRes = await documentServices.checks.checkDocumentAccess(
		context,
		{
			collectionKey: data.collectionKey,
			id: data.documentId,
		},
	);
	if (documentAccessRes.error) return documentAccessRes;

	const Workflows = new DocumentWorkflowsRepository(
		context.db.client,
		context.config.db,
	);
	const Assignees = new DocumentWorkflowAssigneesRepository(
		context.db.client,
		context.config.db,
	);

	const workflowRes = await Workflows.selectSingleDetailed({
		collectionKey: data.collectionKey,
		documentId: data.documentId,
	});
	if (workflowRes.error) return workflowRes;

	// Missing workflow rows behave as the configured initial stage until updated.
	const currentStage = resolveEffectiveWorkflowStage({
		collection: collectionRes.data,
		stageKey: workflowRes.data?.stage_key,
	});
	if (!currentStage) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.workflows.stage.not.found"),
				status: 400,
			},
			data: undefined,
		};
	}

	const nextStage = targetStage ?? currentStage;
	const stageChanged =
		data.stage !== undefined && nextStage.key !== currentStage.key;

	const currentAssigneeIds =
		workflowRes.data?.assignees.map((assignee) => assignee.user_id) ?? [];
	const nextAssigneeIds =
		data.assigneeIds !== undefined
			? Array.from(new Set(data.assigneeIds))
			: currentAssigneeIds;
	const assigneesChanged =
		data.assigneeIds !== undefined &&
		!sameNumericSet(currentAssigneeIds, nextAssigneeIds);

	// The endpoint is explicit: callers must request a real stage or assignee change.
	if (!stageChanged && !assigneesChanged) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.workflows.no.changes"),
				status: 400,
			},
			data: undefined,
		};
	}

	// Assignees must be users who can update documents in this collection.
	if (data.assigneeIds !== undefined && nextAssigneeIds.length > 0) {
		const permission = resolveCollectionPermission({
			collection: collectionRes.data,
			action: "update",
		});
		const Users = new UsersRepository(context.db.client, context.config.db);
		const assignableUsersRes = await Users.selectMultipleWithPermission({
			permission,
			tenantKey: context.request.tenantKey,
		});
		if (assignableUsersRes.error) return assignableUsersRes;

		const assignableUserIds = new Set(
			(assignableUsersRes.data ?? []).map((user) => user.id),
		);
		const invalidAssignee = nextAssigneeIds.find(
			(userId) => !assignableUserIds.has(userId),
		);
		if (invalidAssignee !== undefined) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.documents.workflows.assignee.invalid"),
					status: 400,
				},
				data: undefined,
			};
		}
	}

	const now = new Date().toISOString();
	let workflowId = workflowRes.data?.id;

	// Create the workflow row lazily, otherwise update the existing row in place.
	if (!workflowId) {
		const createRes = await Workflows.createSingle({
			data: {
				collection_key: data.collectionKey,
				document_id: data.documentId,
				stage_key: nextStage.key,
				created_by: data.user.id,
				updated_by: data.user.id,
			},
			returning: ["id"],
			validation: {
				enabled: true,
			},
		});
		if (createRes.error) return createRes;
		workflowId = createRes.data.id;
	} else {
		const updateRes = await Workflows.updateSingle({
			where: [{ key: "id", operator: "=", value: workflowId }],
			data: {
				stage_key: nextStage.key,
				updated_by: data.user.id,
				updated_at: now,
			},
		});
		if (updateRes.error) return updateRes;
	}

	// Assignee updates are replacement-based and only run when assigneeIds is provided.
	if (data.assigneeIds !== undefined) {
		const deleteAssigneesRes = await Assignees.deleteMultiple({
			where: [{ key: "workflow_id", operator: "=", value: workflowId }],
		});
		if (deleteAssigneesRes.error) return deleteAssigneesRes;

		if (nextAssigneeIds.length > 0) {
			const createAssigneesRes = await Assignees.createMultiple({
				data: nextAssigneeIds.map((userId) => ({
					workflow_id: workflowId,
					user_id: userId,
					assigned_by: data.user.id,
				})),
			});
			if (createAssigneesRes.error) return createAssigneesRes;
		}
	}

	const hookRes = await executeHooks(
		context,
		{
			service: "documentWorkflows",
			event: "afterUpdate",
			config: context.config,
			collectionInstance: collectionRes.data,
		},
		{
			meta: {
				collection: collectionRes.data,
				collectionKey: data.collectionKey,
				userId: data.user.id,
				collectionTableNames: tableNamesRes.data,
				tenantKey: context.request.tenantKey ?? null,
			},
			data: {
				collectionKey: data.collectionKey,
				documentId: data.documentId,
				userId: data.user.id,
				previousStage: currentStage.key,
				nextStage: nextStage.key,
				previousAssigneeIds: currentAssigneeIds,
				nextAssigneeIds,
				stageChanged,
				assigneesChanged,
			},
		},
	);
	if (hookRes.error) return hookRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateSingle;
