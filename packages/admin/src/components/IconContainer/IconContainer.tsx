import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

interface IconContainerProps {
	children: JSXElement;
	class?: string;
	size?: "small" | "medium";
	theme?: "default" | "primary" | "danger";
}

const IconContainer: Component<IconContainerProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			class={classNames(
				"grid shrink-0 place-items-center rounded-md border",
				props.class,
				{
					"size-8": props.size === "small",
					"size-9": props.size === undefined || props.size === "medium",
					"border-border bg-input text-body":
						props.theme === undefined || props.theme === "default",
					"border-primary-low-border bg-primary-low text-primary-low-foreground":
						props.theme === "primary",
					"border-danger-low-border bg-danger-low text-danger-low-foreground":
						props.theme === "danger",
				},
			)}
		>
			{props.children}
		</div>
	);
};

export default IconContainer;
