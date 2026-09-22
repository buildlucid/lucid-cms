import type {
	Collection,
	InternalCollectionDocument,
	WorkflowStageColor,
} from "@types";
import { type Component, createMemo } from "solid-js";
import type { PillVariant } from "@/components/Pill/Pill";
import Table from "@/components/Table/Table";
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

const WorkflowStageCell: Component<{
	column?: string;
	document: InternalCollectionDocument;
	collection: Collection;
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
		<Table.Pill
			column={props.column}
			text={label()}
			variant={stageVariants[color()]}
		/>
	);
};

export default WorkflowStageCell;
