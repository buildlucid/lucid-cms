import type {
	Collection,
	InternalCollectionDocument,
	WorkflowStageColor,
} from "@types";
import { type Component, createMemo } from "solid-js";
import T from "@/translations";
import helpers from "@/utils/helpers";
import PillCol from "./PillCol";

const WorkflowStageCol: Component<{
	document: InternalCollectionDocument;
	collection: Collection;
	include: boolean[];
	index: number;
}> = (props) => {
	// -----------------------------------
	// Memos
	const stage = createMemo(() =>
		props.collection.config.publishing.workflow?.stages.find(
			(stage) => stage.key === props.document.workflow?.stage,
		),
	);
	const label = createMemo(
		() =>
			helpers.getLocaleValue({
				value: stage()?.name,
				fallback: props.document.workflow?.stage ?? T()("workflow_no_stage"),
			}) || T()("workflow_no_stage"),
	);
	const color = createMemo<WorkflowStageColor>(() => stage()?.color ?? "grey");

	// -----------------------------------
	// Render
	return (
		<PillCol
			text={label()}
			theme={color()}
			options={{ include: props.include[props.index] }}
		/>
	);
};

export default WorkflowStageCol;
