import { A } from "@solidjs/router";
import classNames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";

const DashboardMetricTile: Component<{
	icon: JSXElement;
	label: string;
	value?: number | string;
	description?: string;
	descriptionLines?: 1 | 2;
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
						"border-border bg-background text-icon": props.tone === "grey",
						"border-blue-low-border bg-blue-low text-blue-low-foreground":
							props.tone === "blue",
						"border-green-low-border bg-green-low text-green-low-foreground":
							props.tone === "green",
						"border-purple-low-border bg-purple-low text-purple-low-foreground":
							props.tone === "purple",
						"border-danger-low-border bg-danger-low text-danger-low-foreground":
							props.tone === "red",
						"border-warning-low-border bg-warning-low text-warning-low-foreground":
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
					<span
						class={classNames("mt-0.5 text-sm leading-5 text-body", {
							"line-clamp-1": props.descriptionLines !== 2,
							"line-clamp-2": props.descriptionLines === 2,
						})}
					>
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
						"group flex h-full items-start gap-3 bg-card px-3 py-3 text-left transition-colors duration-200 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary",
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
						"group flex h-full items-start gap-3 bg-card px-3 py-3 text-left transition-colors duration-200 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary",
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
