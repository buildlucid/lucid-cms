import type { WorkflowStageColor } from "@types";
import type { Component } from "solid-js";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import { workflowStageIndicators } from "@/utils/document-sidebar";

const WorkflowStageOption: Component<{
	label: string;
	color: WorkflowStageColor;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<span class="flex min-w-0 items-center gap-2">
			<StatusIndicator variant={workflowStageIndicators[props.color]} />
			<span class="truncate">{props.label}</span>
		</span>
	);
};

export default WorkflowStageOption;
