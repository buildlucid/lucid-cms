import { A } from "@solidjs/router";
import classNames from "classnames";
import { TbOutlineCaretRight } from "solid-icons/tb";
import { type Component, createMemo, For, Show } from "solid-js";

/**
 * A trail of links to the current page, kept to one line. Earlier crumbs
 * truncate first and drop out when the trail's own width is narrow, so the
 * current page stays readable beside other header content.
 */
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
	const crumbs = createMemo(() =>
		(props.breadcrumbs ?? []).filter((crumb) => crumb.include !== false),
	);

	// ----------------------------------------
	// Render
	return (
		<Show when={crumbs().length > 0}>
			<nav
				class={classNames("@container/breadcrumbs block min-w-0", {
					"border-b border-border": props.options?.noBorder !== true,
					"px-4 md:px-6 py-4": props.options?.noPadding !== true,
				})}
			>
				<ol class="flex min-w-0 items-center">
					<For each={crumbs()}>
						{(crumb, index) => {
							const last = () => index() === crumbs().length - 1;
							return (
								<li
									//* list items and links take the base text size from base.css, so both set it
									class={classNames("min-w-0 items-center text-sm", {
										"flex flex-1": last(),
										"hidden max-w-48 shrink @lg/breadcrumbs:flex": !last(),
									})}
									aria-current={last() ? "page" : undefined}
								>
									<Show
										when={crumb.link}
										fallback={
											<span
												class="truncate whitespace-nowrap text-body"
												title={crumb.label}
											>
												{crumb.label}
											</span>
										}
									>
										{(link) => (
											<A
												href={link()}
												class="truncate whitespace-nowrap text-sm text-body hover:text-title"
												title={crumb.label}
											>
												{crumb.label}
											</A>
										)}
									</Show>
									<Show when={!last()}>
										<TbOutlineCaretRight
											class="mx-2 shrink-0 text-sm"
											aria-hidden="true"
										/>
									</Show>
								</li>
							);
						}}
					</For>
				</ol>
			</nav>
		</Show>
	);
};
