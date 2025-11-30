import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface PillProps {
	theme: "primary" | "grey" | "red" | "warning" | "secondary";
	children: JSXElement;
	class?: string;
	tooltip?: string;
}

const Pill: Component<PillProps> = (props) => {
	// ----------------------------------
	// Return
	return (
		<span
			class={classNames(
				"rounded-full px-2 py-0.5 text-xs font-medium inline-flex whitespace-nowrap",
				props.class,
				{
					"bg-primary-base text-primary-contrast": props.theme === "primary",
					"bg-input-base text-title": props.theme === "grey",
					"bg-error-base text-error-contrast": props.theme === "red",
					"bg-warning-base/10 border border-warning-base/20 text-body":
						props.theme === "warning",
					"bg-secondary-base text-secondary-contrast":
						props.theme === "secondary",
				},
			)}
			title={props.tooltip}
		>
			{props.children}
		</span>
	);
};

export default Pill;
