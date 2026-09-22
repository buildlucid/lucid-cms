import type { WorkflowStageColor } from "@types";
import type { Component } from "solid-js";
import StatusIndicator, {
	type StatusIndicatorVariant,
} from "@/components/StatusIndicator/StatusIndicator";

const stageVariants: Record<WorkflowStageColor, StatusIndicatorVariant> = {
	grey: "neutral-subtle",
	red: "danger-subtle",
	yellow: "yellow-subtle",
	green: "green-subtle",
	blue: "blue-subtle",
	purple: "purple-subtle",
};

const WorkflowStageOption: Component<{
	label: string;
	color: WorkflowStageColor;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<span class="flex min-w-0 items-center gap-2">
			<StatusIndicator variant={stageVariants[props.color]} />
			<span class="truncate">{props.label}</span>
		</span>
	);
};

export default WorkflowStageOption;
