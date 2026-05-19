import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface PillProps {
	theme:
		| "primary"
		| "primary-opaque"
		| "grey"
		| "red"
		| "yellow"
		| "green"
		| "blue"
		| "info-opaque"
		| "purple"
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
				"inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-4 whitespace-nowrap",
				props.class,
				{
					"bg-primary-base text-primary-contrast": props.theme === "primary",
					"bg-primary-muted-bg text-primary-base border border-primary-muted-border":
						props.theme === "primary-opaque",
					"bg-input-base text-title": props.theme === "grey",
					"bg-error-base text-error-contrast": props.theme === "red",
					"bg-workflow-yellow-bg border border-workflow-yellow-border text-workflow-yellow-text":
						props.theme === "yellow",
					"bg-workflow-green-bg border border-workflow-green-border text-workflow-green-text":
						props.theme === "green",
					"bg-workflow-blue-bg border border-workflow-blue-border text-workflow-blue-text":
						props.theme === "blue",
					"bg-info-base/10 border border-info-base/20 text-info-base":
						props.theme === "info-opaque",
					"bg-workflow-purple-bg border border-workflow-purple-border text-workflow-purple-text":
						props.theme === "purple",
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
