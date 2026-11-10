import classnames from "classnames";
import type { Component, JSX } from "solid-js";
import Tooltip from "@/components/Tooltip/Tooltip";

const ToolbarButton: Component<{
	isActive: boolean;
	onClick: () => void;
	disabled?: boolean;
	title: string;
	mode?: "default" | "pill";
	children: JSX.Element;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Tooltip
			type="button"
			class={classnames("flex items-center justify-center", {
				"h-7 min-w-7 px-1.5 rounded-md text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-ring border":
					props.mode === "pill",
				"p-1.5 rounded-sm transition-colors border disabled:opacity-50 disabled:cursor-not-allowed":
					props.mode === "default",
				"bg-primary-low text-primary-low-foreground border-primary-low-border":
					props.isActive,
				"text-body hover:bg-background-hover hover:text-title border-transparent":
					!props.isActive,
			})}
			onMouseDown={(e) => e.preventDefault()}
			onClick={() => props.onClick()}
			disabled={props.disabled}
			content={props.title}
		>
			{props.children}
		</Tooltip>
	);
};

export default ToolbarButton;
