import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type {
	PublishingWorkflowConfig,
	PublishingWorkflowStageConfig,
} from "../../../libs/collection/builders/collection-builder/types.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { LucidAuth } from "../../../types/hono.js";

/**
 * Reads the configured workflow from a collection, if document workflows are enabled.
 */
export const getWorkflowConfig = (
	collection: CollectionBuilder,
): PublishingWorkflowConfig | undefined => collection.getData.workflow;

/**
 * Finds a configured workflow stage by key without applying initial-stage fallback.
 */
export const getWorkflowStage = (props: {
	collection: CollectionBuilder;
	stageKey: string;
}): PublishingWorkflowStageConfig | undefined =>
	getWorkflowConfig(props.collection)?.stages.find(
		(stage) => stage.key === props.stageKey,
	);

/**
 * Resolves the persisted stage key, falling back to the workflow initial stage.
 */
export const resolveEffectiveWorkflowStage = (props: {
	collection: CollectionBuilder;
	stageKey?: string | null;
}): PublishingWorkflowStageConfig | undefined => {
	const workflow = getWorkflowConfig(props.collection);
	if (!workflow) return undefined;

	const storedStage = props.stageKey
		? workflow.stages.find((stage) => stage.key === props.stageKey)
		: undefined;

	return (
		storedStage ??
		workflow.stages.find((stage) => stage.key === workflow.initial)
	);
};

/**
 * Checks whether the effective workflow stage allows publishing to a target.
 */
export const workflowStageAllowsTarget = (props: {
	collection: CollectionBuilder;
	stageKey?: string | null;
	target: string;
}): boolean => {
	const stage = resolveEffectiveWorkflowStage({
		collection: props.collection,
		stageKey: props.stageKey,
	});
	if (!stage) return true;

	return stage.publishTargets.includes(props.target);
};

/**
 * Applies optional workflow transition permissions for leaving and entering stages.
 */
export const canMoveWorkflowStage = (props: {
	user: LucidAuth;
	fromStage?: PublishingWorkflowStageConfig;
	toStage?: PublishingWorkflowStageConfig;
}): boolean => {
	const permissions = [
		props.fromStage?.permissions.moveFrom,
		props.toStage?.permissions.moveTo,
	].filter((permission): permission is string => Boolean(permission));

	if (permissions.length === 0) return true;

	return hasAccess({
		user: props.user,
		requiredPermissions: permissions,
	});
};
