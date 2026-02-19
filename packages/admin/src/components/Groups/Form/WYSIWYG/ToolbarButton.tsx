import classnames from "classnames";
import type { Component, JSX } from "solid-js";

const ToolbarButton: Component<{
	isActive: boolean;
	onClick: () => void;
	disabled?: boolean;
	title: string;
	children: JSX.Element;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<button
			type="button"
			class={classnames(
				"p-1.5 rounded transition-colors duration-150 border disabled:opacity-50 disabled:cursor-not-allowed",
				{
					"bg-primary-base/20 text-primary-base border-primary-base/30":
						props.isActive,
					"text-body hover:bg-background-hover hover:text-title border-transparent":
						!props.isActive,
				},
			)}
			onClick={() => props.onClick()}
			disabled={props.disabled}
			title={props.title}
		>
			{props.children}
		</button>
	);
};

export default ToolbarButton;
