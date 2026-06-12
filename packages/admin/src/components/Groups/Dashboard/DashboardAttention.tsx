import { A } from "@solidjs/router";
import classNames from "classnames";
import { FaSolidCircleCheck } from "solid-icons/fa";
import { type Component, For, type JSXElement, Show } from "solid-js";
import Button from "@/components/Partials/Button";
import T from "@/translations";

export type DashboardAttentionTone = "info" | "success" | "warning" | "danger";

export interface DashboardAttentionItem {
	key: string;
	title: string;
	description: string;
	icon: JSXElement;
	tone: DashboardAttentionTone;
	action?: {
		label: string;
		href?: string;
		onClick?: () => void;
	};
}

const DashboardAttention: Component<{
	items: DashboardAttentionItem[];
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<section>
			<div class="mb-4 flex items-end justify-between gap-4">
				<div>
					<h2>{T()("dashboard.attention.title")}</h2>
					<p class="mt-1 text-sm text-body">
						{T()("dashboard.attention.description")}
					</p>
				</div>
			</div>
			<Show
				when={props.items.length > 0}
				fallback={
					<div class="flex items-start gap-3 rounded-md border border-workflow-green-border bg-workflow-green-bg px-3 py-3">
						<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-workflow-green-border text-workflow-green-text">
							<FaSolidCircleCheck size={14} />
						</span>
						<div>
							<h3 class="text-sm font-medium">
								{T()("dashboard.attention.empty.title")}
							</h3>
							<p class="mt-1 text-sm text-body">
								{T()("dashboard.attention.empty.description")}
							</p>
						</div>
					</div>
				}
			>
				<div class="overflow-hidden rounded-md border border-border bg-card-base">
					<For each={props.items}>
						{(item) => (
							<article
								class={
									"flex min-w-0 items-start gap-3 border-b border-border bg-card-base px-3 py-3 last:border-b-0"
								}
							>
								<span
									class={classNames(
										"flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
										{
											"border-info-base/20 bg-info-base/10 text-info-base":
												item.tone === "info",
											"border-workflow-green-border bg-workflow-green-bg text-workflow-green-text":
												item.tone === "success",
											"border-warning-base/20 bg-warning-base/10 text-warning-base":
												item.tone === "warning",
											"border-error-base/20 bg-error-base/10 text-error-base":
												item.tone === "danger",
										},
									)}
								>
									{item.icon}
								</span>
								<div class="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-start md:justify-between">
									<div class="min-w-0">
										<h3 class="text-sm font-medium leading-5 text-title">
											{item.title}
										</h3>
										<p class="mt-0.5 line-clamp-2 text-sm leading-5 text-body">
											{item.description}
										</p>
									</div>
									<Show when={item.action}>
										{(action) => (
											<div class="flex shrink-0 md:pl-3">
												<Show
													when={action().href}
													fallback={
														<Button
															type="button"
															theme="border-outline"
															size="small"
															onClick={action().onClick}
														>
															{action().label}
														</Button>
													}
												>
													{(href) => (
														<A
															href={href()}
															class="flex h-8 items-center justify-center rounded-md border border-border bg-input-base px-2 text-center text-sm font-base text-subtitle transition-colors duration-200 hover:border-transparent hover:bg-secondary-hover hover:text-secondary-contrast focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base"
														>
															{action().label}
														</A>
													)}
												</Show>
											</div>
										)}
									</Show>
								</div>
							</article>
						)}
					</For>
				</div>
			</Show>
		</section>
	);
};

export default DashboardAttention;
