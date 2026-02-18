import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface PillProps {
	theme:
		| "primary"
		| "primary-opaque"
		| "grey"
		| "red"
		| "error-opaque"
		| "warning"
		| "warning-opaque"
		| "secondary"
		| "outline";
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
				"rounded-full px-2.5 py-0.5 text-xs font-medium inline-flex whitespace-nowrap",
				props.class,
				{
					"bg-primary-base text-primary-contrast": props.theme === "primary",
					"bg-primary-base/20 text-primary-base border border-primary-base/30":
						props.theme === "primary-opaque",
					"bg-input-base text-title": props.theme === "grey",
					"bg-error-base text-error-contrast": props.theme === "red",
					"bg-error-base/10 border border-error-base/20 text-error-base":
						props.theme === "error-opaque",
					"bg-warning-base text-warning-contrast": props.theme === "warning",
					"bg-warning-base/10 border border-warning-base/20 text-warning-base":
						props.theme === "warning-opaque",
					"bg-secondary-base text-secondary-contrast":
						props.theme === "secondary",
					"bg-input-base border border-border text-body":
						props.theme === "outline",
				},
			)}
			title={props.tooltip}
		>
			{props.children}
		</span>
	);
};

export default Pill;
