import type CollectionDefinition from "../../../libs/collection/definitions/collection/index.js";
import type {
	PublishingWorkflowConfig,
	PublishingWorkflowStageConfig,
} from "../../../libs/collection/definitions/collection/types.js";

/**
 * Reads the configured workflow from a collection, if document workflows are enabled.
 */
export const getWorkflowConfig = (
	collection: CollectionDefinition,
): PublishingWorkflowConfig | undefined =>
	collection.getData.publishing.workflow;

/**
 * Resolves the persisted stage key, falling back to the workflow initial stage.
 */
export const resolveEffectiveWorkflowStage = (props: {
	collection: CollectionDefinition;
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
 * Only targets that some stage lists are gated, so a target no stage mentions
 * is allowed whatever the stage.
 */
export const workflowStageAllowsTarget = (props: {
	collection: CollectionDefinition;
	stageKey?: string | null;
	target: string;
}): boolean => {
	const stage = resolveEffectiveWorkflowStage({
		collection: props.collection,
		stageKey: props.stageKey,
	});
	if (!stage) return true;

	const gated = getWorkflowConfig(props.collection)?.stages.some((other) =>
		other.targets.includes(props.target),
	);
	return !gated || stage.targets.includes(props.target);
};
