import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

interface ReleaseRequestOverviewTileProps {
	icon: JSXElement;
	label: string;
	value?: number;
	tone: "grey" | "blue" | "green" | "purple" | "red" | "yellow";
	active?: boolean;
	loading?: boolean;
	onClick: () => void;
}

const ReleaseRequestOverviewTile: Component<ReleaseRequestOverviewTileProps> = (
	props,
) => {
	// ----------------------------------
	// Render
	return (
		<button
			type="button"
			class={classNames(
				"group flex items-start gap-2.5 rounded-md border bg-card-base px-3 py-2.5 text-left transition-colors duration-200 hover:bg-card-hover",
				{
					"border-primary-base/55 ring-1 ring-inset ring-primary-base/20":
						props.active,
					"border-border": !props.active,
				},
			)}
			onClick={props.onClick}
		>
			<span
				class={classNames(
					"flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors duration-200",
					{
						"border-border bg-background-base text-icon-base":
							props.tone === "grey" && !props.active,
						"border-workflow-blue-border bg-workflow-blue-bg text-workflow-blue-text":
							props.tone === "blue" || (props.tone === "grey" && props.active),
						"border-workflow-green-border bg-workflow-green-bg text-workflow-green-text":
							props.tone === "green",
						"border-workflow-purple-border bg-workflow-purple-bg text-workflow-purple-text":
							props.tone === "purple",
						"border-error-base/20 bg-error-base/10 text-error-base":
							props.tone === "red",
						"border-warning-base/20 bg-warning-base/10 text-warning-base":
							props.tone === "yellow",
					},
				)}
			>
				{props.icon}
			</span>
			<span class="min-w-0">
				<span class="block text-base font-semibold leading-none text-title">
					{props.loading ? "-" : (props.value ?? 0)}
				</span>
				<span class="mt-1 block truncate text-xs text-body">{props.label}</span>
			</span>
		</button>
	);
};

export default ReleaseRequestOverviewTile;
