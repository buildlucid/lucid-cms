import { A } from "@solidjs/router";
import classNames from "classnames";
import { FaSolidCaretRight } from "solid-icons/fa";
import { type Component, createMemo, For, Show } from "solid-js";

export const Breadcrumbs: Component<{
	breadcrumbs?: {
		link?: string;
		label: string;
		include?: boolean;
	}[];
	options?: {
		noBorder?: boolean;
		noPadding?: boolean;
	};
}> = (props) => {
	// ----------------------------------------
	// Memos
	const includedBreadcrumbs = createMemo(() => {
		return (props.breadcrumbs ?? []).filter((b) => b.include !== false);
	});
	const lastBreadcrumb = createMemo(() => {
		const crumbs = includedBreadcrumbs();
		return crumbs.length ? crumbs[crumbs.length - 1] : undefined;
	});

	// ----------------------------------------
	// Render
	return (
		<Show when={props.breadcrumbs}>
			<nav
				class={classNames("block", {
					"border-b border-border": props.options?.noBorder !== true,
					"px-4 md:px-6 py-4": props.options?.noPadding !== true,
				})}
			>
				<div class="block lg:hidden">
					<Show when={lastBreadcrumb()}>
						{(breadcrumb) => (
							<Show when={breadcrumb().link}>
								<A
									href={breadcrumb().link || ""}
									class="flex items-center text-body hover:text-primaryDark text-sm"
								>
									{breadcrumb().label}
								</A>
							</Show>
						)}
					</Show>
					<Show when={lastBreadcrumb() && !lastBreadcrumb()?.link}>
						<span class="flex items-center text-body hover:text-primaryDark text-sm">
							{lastBreadcrumb()?.label}
						</span>
					</Show>
				</div>

				<ul class="hidden lg:flex items-center">
					<For each={props.breadcrumbs}>
						{(breadcrumb, i) => (
							<Show when={breadcrumb.include !== false}>
								<li class="flex items-center">
									<Show when={breadcrumb.link}>
										<A
											href={breadcrumb.link || ""}
											class="flex items-center text-body hover:text-primaryDark text-sm"
										>
											{breadcrumb.label}
										</A>
									</Show>
									<Show when={!breadcrumb.link}>
										<span class="flex items-center text-body hover:text-primaryDark text-sm">
											{breadcrumb.label}
										</span>
									</Show>
									<Show
										when={
											props.breadcrumbs && i() < props.breadcrumbs.length - 1
										}
									>
										<FaSolidCaretRight class="mx-2 text-sm" />
									</Show>
								</li>
							</Show>
						)}
					</For>
				</ul>
			</nav>
		</Show>
	);
};
