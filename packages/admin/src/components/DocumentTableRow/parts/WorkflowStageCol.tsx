import type {
	Collection,
	InternalCollectionDocument,
	WorkflowStageColor,
} from "@types";
import { type Component, createMemo } from "solid-js";
import type { PillVariant } from "@/components/Pill/Pill";
import TablePillCell from "@/components/TablePillCell/TablePillCell";
import T from "@/translations";
import helpers from "@/utils/helpers";

/** Stage colours come from collection config, pills name theirs semantically. */
const stageVariants: Record<WorkflowStageColor, PillVariant> = {
	grey: "neutral",
	red: "danger",
	yellow: "workflow-yellow",
	green: "workflow-green",
	blue: "workflow-blue",
	purple: "workflow-purple",
};

const WorkflowStageCol: Component<{
	document: InternalCollectionDocument;
	collection: Collection;
	include: boolean[];
	index: number;
}> = (props) => {
	// -----------------------------------
	// Memos
	const stage = createMemo(() =>
		props.collection.publishing.workflow?.stages.find(
			(stage) => stage.key === props.document.workflow?.stage,
		),
	);
	const label = createMemo(
		() =>
			helpers.getLocaleValue({
				value: stage()?.label,
				fallback:
					props.document.workflow?.stage ?? T()("documents.workflow.no.stage"),
			}) || T()("documents.workflow.no.stage"),
	);
	const color = createMemo<WorkflowStageColor>(() => stage()?.color ?? "grey");

	// -----------------------------------
	// Render
	return (
		<TablePillCell
			text={label()}
			variant={stageVariants[color()]}
			options={{ include: props.include[props.index] }}
		/>
	);
};

export default WorkflowStageCol;
