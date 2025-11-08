import classNames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";

interface InfoRowProps {
	title?: string;
	description?: string;
	permission?: boolean;
	actions?: JSXElement;
	actionAlignment?: "top" | "center";
	left?: JSXElement;
	children?: JSXElement;
}

const InfoRow: Component<InfoRowProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Show when={props.permission !== false}>
			<div class="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-10 mb-5 last:mb-0">
				<div class="md:col-span-1">
					<h2 class="text-base mb-1">{props.title}</h2>
					<Show when={props.description}>
						<p class="text-sm">{props.description}</p>
					</Show>
					<Show when={props.left}>
						<div class="mt-4">{props.left}</div>
					</Show>
				</div>
				<div class="md:col-span-2 lg:col-span-3">{props.children}</div>
			</div>
		</Show>
	);
};

const InfoRowContent: Component<InfoRowProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class="bg-card-base p-4 rounded-md border border-border mb-4 last:mb-0">
			<Show when={props.title || props.description || props.actions}>
				<div
					class={classNames(
						"flex flex-col gap-6 md:flex-row md:justify-between",
						{
							"md:items-start":
								props.actionAlignment === "top" ||
								props.actionAlignment === undefined,
							"md:items-center": props.actionAlignment === "center",
						},
					)}
				>
					<div>
						<Show when={props.title}>
							<h3 class="text-base mb-1">{props.title}</h3>
						</Show>
						<Show when={props.description}>
							<p class="text-sm max-w-4xl">{props.description}</p>
						</Show>
					</div>
					<Show when={props.actions}>
						<div class="flex items-center gap-2">{props.actions}</div>
					</Show>
				</div>
			</Show>
			<Show when={props.children}>
				<div
					class={classNames({
						"mt-4": props.title || props.description,
					})}
				>
					{props.children}
				</div>
			</Show>
		</div>
	);
};

export default {
	Root: InfoRow,
	Content: InfoRowContent,
};
