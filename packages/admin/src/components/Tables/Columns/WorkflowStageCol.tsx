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
		props.collection.features.workflow?.stages.find(
			(stage) => stage.key === props.document.workflow?.stage,
		),
	);
	const label = createMemo(
		() =>
			helpers.getLocaleValue({
				value: stage()?.name,
				fallback:
					props.document.workflow?.stage ?? T()("documents.workflow.no.stage"),
			}) || T()("documents.workflow.no.stage"),
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
