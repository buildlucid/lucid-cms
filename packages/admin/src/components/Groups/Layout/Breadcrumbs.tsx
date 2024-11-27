import { type Component, Show, For } from "solid-js";
import { FaSolidCaretRight } from "solid-icons/fa";
import { A } from "@solidjs/router";
import classNames from "classnames";

export const Breadcrumbs: Component<{
	breadcrumbs?: {
		link: string;
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
					"px-15 md:px-30 py-15": props.options?.noPadding !== true,
				})}
			>
				<ul class="flex items-center">
					<For each={props.breadcrumbs}>
						{(breadcrumb, i) => (
							<Show when={breadcrumb.include !== false}>
								<li class="flex items-center">
									<A
										href={breadcrumb.link}
										class="flex items-center text-title hover:text-primaryDark text-sm"
									>
										{breadcrumb.label}
									</A>
									<Show
										when={
											props.breadcrumbs && i() < props.breadcrumbs.length - 1
										}
									>
										<FaSolidCaretRight class="mx-2.5 text-sm" />
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
