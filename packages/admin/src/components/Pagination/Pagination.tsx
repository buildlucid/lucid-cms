import { Pagination as KobPagination } from "@kobalte/core";
import type { ResponseBody } from "@types";
import classNames from "classnames";
import { TbOutlineChevronLeft, TbOutlineChevronRight } from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Match,
	Show,
	Switch,
} from "solid-js";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import T from "@/translations";

export type PaginationVariant = "footer" | "inline";

export type PaginationPadding = "none" | "sm" | "md";

export interface PaginationProps {
	/** The `pagination` from a list response. */
	pagination?: ResponseBody<unknown>["pagination"];
	/** Shows a skeleton in place of the summary, for a first load with no `pagination` yet. */
	loading?: boolean;
	queryState: QueryStateResponse;
	/** `inline` is for use inside a card. @default "footer" */
	variant?: PaginationVariant;
	/** @default "none" */
	padding?: PaginationPadding;
	/** Renders nothing when there are no results. */
	hideWhenEmpty?: boolean;
	class?: string;
}

/**
 * Page controls and a results summary for a list.
 *
 * @example
 * ```tsx
 * import { Pagination } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Pagination
 * 		pagination={redirects.data?.pagination}
 * 		loading={redirects.isLoading}
 * 		queryState={queryState}
 * 		padding="md"
 * 	/>
 * );
 * ```
 */
const Pagination: Component<PaginationProps> = (props) => {
	// -------------------------------------
	// State & Hooks
	const [page, setPage] = createSignal(1);

	// -------------------------------------
	// Memos
	const variant = createMemo(() => props.variant ?? "footer");
	const padding = createMemo(() => props.padding ?? "none");
	const textData = createMemo(() => {
		return {
			page: props.pagination?.currentPage ?? 1,
			lastPage: props.pagination?.lastPage ?? 1,
			total: props.pagination?.total ?? 0,
		};
	});
	const lastPage = createMemo(() => {
		return props.pagination?.lastPage ?? 1;
	});
	const isEmpty = createMemo(() => (props.pagination?.total ?? 0) === 0);

	// -------------------------------------
	// Effects
	createEffect(() => {
		setPage(props.pagination?.currentPage ?? 1);
	});

	// -------------------------------------
	// Render
	return (
		<Show when={!(props.hideWhenEmpty && isEmpty())}>
			<footer
				data-pagination
				class={classNames(
					{
						"border-t border-border": variant() === "footer",
						"p-4": variant() === "footer" && padding() === "sm",
						"p-4 md:p-6": variant() === "footer" && padding() === "md",
						//* a card's own edge already separates it, so only lead the control
						"mt-4": variant() === "inline" && padding() === "none",
						"px-4 pt-4": variant() === "inline" && padding() === "sm",
						"px-4 md:px-6 pt-4 md:pt-6":
							variant() === "inline" && padding() === "md",
					},
					props.class,
				)}
			>
				{/* as tall as the page buttons, so the footer keeps its height when they come and go */}
				<div class="flex md:flex-row flex-col justify-between md:items-center gap-2 md:min-h-8.5">
					<span class="text-sm text-body md:mb-0" aria-busy={props.loading}>
						<Switch>
							<Match when={props.loading}>
								<span class="skeleton block w-44" aria-hidden="true">
									&nbsp;
								</span>
							</Match>
							{/* nothing has loaded, so there is nothing to count */}
							<Match when={props.pagination === undefined}>&nbsp;</Match>
							<Match when={textData().total === 0}>
								{T()("empty.states.pagination")}
							</Match>
							<Match when={textData().total > 0}>
								{T()("pagination.summary", {
									page: textData().page,
									lastPage: textData().lastPage,
									total: textData().total,
								})}
							</Match>
						</Switch>
					</span>
					<Show when={lastPage() > 1 && !props.loading}>
						<KobPagination.Root
							class="flex [&>ul]:flex [&>ul]:border [&>ul]:border-border [&>ul]:rounded-md [&>ul]:overflow-hidden"
							page={page()}
							onPageChange={(nextPage) => {
								props.queryState.setParams({
									pagination: {
										page: nextPage,
										perPage: props.pagination?.perPage || undefined,
									},
								});
								setPage(nextPage);
							}}
							count={lastPage()}
							itemComponent={(itemProps) => (
								<KobPagination.Item
									class="size-8 flex text-sm items-center justify-center text-body data-current:bg-secondary data-current:text-secondary-foreground data-current:font-medium hover:bg-card-hover hover:text-title data-current:hover:bg-secondary data-current:hover:text-secondary-foreground transition-colors bg-card focus-ring-inset"
									page={itemProps.page}
								>
									{itemProps.page}
								</KobPagination.Item>
							)}
							ellipsisComponent={() => (
								<KobPagination.Ellipsis class="size-8 text-muted flex items-center justify-center bg-card">
									...
								</KobPagination.Ellipsis>
							)}
						>
							<KobPagination.Previous class="size-8 flex items-center justify-center text-body hover:bg-card-hover hover:text-title transition-colors disabled:opacity-50 disabled:hover:bg-card bg-card focus-ring-inset">
								<TbOutlineChevronLeft size={14} />
							</KobPagination.Previous>
							<KobPagination.Items />
							<KobPagination.Next class="size-8 flex items-center justify-center text-body hover:bg-card-hover hover:text-title transition-colors disabled:opacity-50 disabled:hover:bg-card bg-card focus-ring-inset">
								<TbOutlineChevronRight size={14} />
							</KobPagination.Next>
						</KobPagination.Root>
					</Show>
				</div>
			</footer>
		</Show>
	);
};

export default Pagination;
