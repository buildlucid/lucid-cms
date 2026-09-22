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

/** Maps stage colours from collection config to pill variants. */
const stageVariants: Record<WorkflowStageColor, PillVariant> = {
	grey: "neutral",
	red: "danger",
	yellow: "yellow-subtle",
	green: "green-subtle",
	blue: "blue-subtle",
	purple: "purple-subtle",
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
