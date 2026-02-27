import classnames from "classnames";
import type { Component, JSX } from "solid-js";

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
		<button
			type="button"
			class={classnames("flex items-center justify-center", {
				"h-7 min-w-7 px-1.5 rounded-md text-xs transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-1 focus-visible:ring-primary-base border":
					props.mode === "pill",
				"p-1.5 rounded transition-colors duration-150 border disabled:opacity-50 disabled:cursor-not-allowed":
					props.mode === "default",
				"bg-primary-muted-bg text-primary-base border-primary-muted-border":
					props.isActive,
				"text-body hover:bg-background-hover hover:text-title border-transparent":
					!props.isActive,
			})}
			onMouseDown={(e) => e.preventDefault()}
			onClick={() => props.onClick()}
			disabled={props.disabled}
			title={props.title}
		>
			{props.children}
		</button>
	);
};

export default ToolbarButton;
