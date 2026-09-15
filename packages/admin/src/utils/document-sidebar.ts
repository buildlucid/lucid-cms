import type { Collection, WorkflowStageColor } from "@types";
import T from "@/translations";
import helpers from "@/utils/helpers";

/**
 * Formats a publish target key with the collection environment label when one exists.
 */
export const formatTargetName = (props: {
	collection?: Collection;
	target: string;
}) => {
	const environment = props.collection?.publishing.targets.find(
		(environment) => environment.key === props.target,
	);

	return (
		helpers.getLocaleValue({
			value: environment?.label,
			fallback: props.target,
		}) || props.target
	);
};

/**
 * Formats a workflow stage key with the configured translated stage name.
 */
export const formatStageName = (props: {
	collection?: Collection;
	stageKey?: string | null;
}) => {
	const stage = props.collection?.publishing.workflow?.stages.find(
		(stage) => stage.key === props.stageKey,
	);

	return (
		helpers.getLocaleValue({
			value: stage?.label,
			fallback: props.stageKey ?? "",
		}) ||
		props.stageKey ||
		T()("documents.workflow.no.stage")
	);
};

/**
 * Resolves the configured workflow stage color with the default grey fallback.
 */
export const getStageColor = (props: {
	collection?: Collection;
	stageKey?: string | null;
}): WorkflowStageColor => {
	return (
		props.collection?.publishing.workflow?.stages.find(
			(stage) => stage.key === props.stageKey,
		)?.color ?? "grey"
	);
};
