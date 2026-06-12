import { A } from "@solidjs/router";
import {
	type Component,
	createMemo,
	For,
	type JSXElement,
	Show,
} from "solid-js";
import T from "@/translations";

export interface DashboardQuickAction {
	key: string;
	title: string;
	description: string;
	icon: JSXElement;
	href?: string;
	onClick?: () => void;
	show?: boolean;
}

const DashboardQuickActions: Component<{
	actions: DashboardQuickAction[];
}> = (props) => {
	// ----------------------------------
	// Memos
	const visibleActions = createMemo(() =>
		props.actions.filter((action) => action.show !== false),
	);

	// ----------------------------------
	// Render
	const content = (action: DashboardQuickAction) => (
		<>
			<span
				class={
					"flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background-base text-icon-base"
				}
			>
				{action.icon}
			</span>
			<span class="min-w-0">
				<span class="block text-sm font-medium leading-5 text-title">
					{action.title}
				</span>
				<span class="mt-0.5 block line-clamp-1 text-sm leading-5 text-body">
					{action.description}
				</span>
			</span>
		</>
	);

	return (
		<section>
			<div class="mb-4">
				<h2>{T()("dashboard.quick.actions.title")}</h2>
				<p class="mt-1 text-sm text-body">
					{T()("dashboard.quick.actions.description")}
				</p>
			</div>
			<Show
				when={visibleActions().length > 0}
				fallback={
					<div class="rounded-md border border-border bg-card-base p-4">
						<p class="text-sm text-body">
							{T()("dashboard.quick.actions.empty")}
						</p>
					</div>
				}
			>
				<div class="overflow-hidden rounded-md border border-border bg-card-base">
					<div class="grid auto-rows-fr grid-cols-1 md:grid-cols-2">
						<For each={visibleActions()}>
							{(action) => (
								<Show
									when={action.href}
									fallback={
										<button
											type="button"
											class={
												"group flex h-full min-h-16 w-full items-start gap-3 border-b border-border bg-card-base px-3 py-3 text-left transition-colors duration-200 last:border-b-0 hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary-base md:odd:border-r md:nth-last-1:border-b-0 md:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
											}
											onClick={action.onClick}
										>
											{content(action)}
										</button>
									}
								>
									{(href) => (
										<A
											href={href()}
											class={
												"group flex h-full min-h-16 w-full items-start gap-3 border-b border-border bg-card-base px-3 py-3 text-left transition-colors duration-200 last:border-b-0 hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary-base md:odd:border-r md:nth-last-1:border-b-0 md:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
											}
										>
											{content(action)}
										</A>
									)}
								</Show>
							)}
						</For>
					</div>
				</div>
			</Show>
		</section>
	);
};

export default DashboardQuickActions;
