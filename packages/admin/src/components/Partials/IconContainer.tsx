import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

interface IconContainerProps {
	children: JSXElement;
	class?: string;
	size?: "small" | "medium";
	theme?: "default" | "primary" | "error";
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
					"border-border bg-input-base text-body":
						props.theme === undefined || props.theme === "default",
					"border-primary-muted-border bg-primary-muted-bg text-primary-muted-contrast":
						props.theme === "primary",
					"border-error-base/20 bg-error-base/10 text-error-base":
						props.theme === "error",
				},
			)}
		>
			{props.children}
		</div>
	);
};

export default IconContainer;
