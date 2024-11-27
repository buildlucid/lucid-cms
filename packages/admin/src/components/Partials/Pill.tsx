import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface PillProps {
	theme: "primary" | "grey" | "red" | "warning" | "secondary";
	children: JSXElement;
}

const Pill: Component<PillProps> = (props) => {
	// ----------------------------------
	// Return
	return (
		<span
			class={classNames(
				"rounded-full px-2 py-0.5 text-xs font-medium inline-flex whitespace-nowrap",
				{
					"bg-primary-base text-primary-contrast": props.theme === "primary",
					"bg-container-4 text-title": props.theme === "grey",
					"bg-error-base text-white": props.theme === "red",
					"bg-warning-base text-title": props.theme === "warning",
					"bg-secondary-base text-secondary-contrast":
						props.theme === "secondary",
				},
			)}
		>
			{props.children}
		</span>
	);
};

export default Pill;
