import type { WorkflowStageColor } from "@types";
import classNames from "classnames";
import type { Component } from "solid-js";

const WorkflowStageOption: Component<{
	label: string;
	color: WorkflowStageColor;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<span class="flex min-w-0 items-center gap-2">
			<span
				class={classNames("h-2.5 w-2.5 shrink-0 rounded-full border", {
					"bg-input-base border-border": props.color === "grey",
					"bg-error-base border-error-base": props.color === "red",
					"bg-workflow-yellow-bg border-workflow-yellow-border":
						props.color === "yellow",
					"bg-workflow-green-bg border-workflow-green-border":
						props.color === "green",
					"bg-workflow-blue-bg border-workflow-blue-border":
						props.color === "blue",
					"bg-workflow-purple-bg border-workflow-purple-border":
						props.color === "purple",
				})}
				aria-hidden="true"
			/>
			<span class="truncate">{props.label}</span>
		</span>
	);
};

export default WorkflowStageOption;
