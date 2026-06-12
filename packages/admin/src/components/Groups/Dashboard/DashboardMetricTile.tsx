import { A } from "@solidjs/router";
import classNames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";

const DashboardMetricTile: Component<{
	icon: JSXElement;
	label: string;
	value?: number | string;
	description?: string;
	tone: "grey" | "blue" | "green" | "purple" | "red" | "yellow";
	href?: string;
	loading?: boolean;
	class?: string;
}> = (props) => {
	// ----------------------------------
	// Render
	const content = () => (
		<>
			<span
				class={classNames(
					"flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors duration-200",
					{
						"border-border bg-background-base text-icon-base":
							props.tone === "grey",
						"border-workflow-blue-border bg-workflow-blue-bg text-workflow-blue-text":
							props.tone === "blue",
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
			<span class="min-w-0 flex-1">
				<span class="block text-sm font-medium leading-5 text-title">
					<span class="font-semibold">
						{props.loading ? "-" : (props.value ?? 0)}
					</span>{" "}
					<span class="lowercase">{props.label}</span>
				</span>
				<Show when={props.description}>
					<span class="mt-0.5 block line-clamp-1 text-sm leading-5 text-body">
						{props.description}
					</span>
				</Show>
			</span>
		</>
	);

	return (
		<Show
			when={props.href}
			fallback={
				<article
					class={classNames(
						"group flex h-full items-start gap-3 bg-card-base px-3 py-3 text-left transition-colors duration-200 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary-base",
						{
							"hover:bg-card-hover": props.href,
						},
						props.class,
					)}
				>
					{content()}
				</article>
			}
		>
			{(href) => (
				<A
					href={href()}
					class={classNames(
						"group flex h-full items-start gap-3 bg-card-base px-3 py-3 text-left transition-colors duration-200 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary-base",
						{
							"hover:bg-card-hover": props.href,
						},
						props.class,
					)}
				>
					{content()}
				</A>
			)}
		</Show>
	);
};

export default DashboardMetricTile;
