import { type Component, Show, For } from "solid-js";
import { FaSolidCaretRight } from "solid-icons/fa";
import { A } from "@solidjs/router";
import classNames from "classnames";

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
	// Render
	return (
		<Show when={props.breadcrumbs}>
			<nav
				class={classNames({
					"border-b border-border": props.options?.noBorder !== true,
					"px-4 md:px-6 py-4": props.options?.noPadding !== true,
				})}
			>
				<ul class="flex items-center">
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
