import { Pagination as KobPagination } from "@kobalte/core";
import type { ResponseBody } from "@types";
import classNames from "classnames";
import { FaSolidChevronLeft, FaSolidChevronRight } from "solid-icons/fa";
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

/** How the control sits in the page around it. */
export type PaginationVariant = "footer" | "inline";

/** Space a pagination control leaves around itself. */
export type PaginationPadding = "none" | "sm" | "md";

export interface PaginationProps {
	/** The meta block a list endpoint returns. */
	meta?: ResponseBody<unknown>["meta"];
	/** Where the current page is read from and written back to. */
	queryState: QueryStateResponse;
	/**
	 * "footer" closes a page off with a divider above and space all round.
	 * "inline" sits inside a card that already has its own edges.
	 * @default "footer"
	 */
	variant?: PaginationVariant;
	/** Space around the control. @default "none" */
	padding?: PaginationPadding;
	/** Renders nothing at all when there is nothing to page through. */
	hideWhenEmpty?: boolean;
	class?: string;
}

/**
 * The page summary and page picker for a list. Pair it with a Table or Grid
 * driven by the same query state.
 *
 * @example
 * ```tsx
 * import { Pagination, Table } from "@lucidcms/admin/components";
 *
 * return (
 * 	<>
 * 		<Table.Root {...tableProps} />
 * 		<Pagination
 * 			meta={reports.data?.meta}
 * 			queryState={queryState}
 * 			padding="md"
 * 		/>
 * 	</>
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
			page: props.meta?.currentPage ?? 1,
			lastPage: props.meta?.lastPage ?? 1,
			total: props.meta?.total ?? 0,
		};
	});
	const lastPage = createMemo(() => {
		return props.meta?.lastPage ?? 1;
	});
	const isEmpty = createMemo(() => (props.meta?.total ?? 0) === 0);

	// -------------------------------------
	// Effects
	createEffect(() => {
		setPage(props.meta?.currentPage ?? 1);
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
				<div class="flex md:flex-row flex-col justify-between md:items-center gap-2">
					<span class="text-sm text-body md:mb-0">
						<Switch>
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
					<Show when={lastPage() > 1}>
						<KobPagination.Root
							class="flex [&>ul]:flex [&>ul]:border [&>ul]:border-border [&>ul]:rounded-md [&>ul]:overflow-hidden"
							page={page()}
							onPageChange={(nextPage) => {
								props.queryState.setParams({
									pagination: {
										page: nextPage,
										perPage: props.meta?.perPage || undefined,
									},
								});
								setPage(nextPage);
							}}
							count={lastPage()}
							itemComponent={(itemProps) => (
								<KobPagination.Item
									class="h-9 w-9 flex text-sm items-center justify-center data-current:bg-secondary-base data-current:text-secondary-contrast hover:bg-secondary-base hover:text-secondary-contrast duration-200 transition-colors bg-card-base"
									page={itemProps.page}
								>
									{itemProps.page}
								</KobPagination.Item>
							)}
							ellipsisComponent={() => (
								<KobPagination.Ellipsis class="h-9 w-9 text-unfocused flex items-center justify-center bg-card-base">
									...
								</KobPagination.Ellipsis>
							)}
						>
							<KobPagination.Previous class="h-9 w-9 flex items-center justify-center text-body hover:bg-secondary-base hover:text-secondary-contrast duration-200 transition-colors disabled:opacity-50 bg-card-base">
								<FaSolidChevronLeft size={14} />
							</KobPagination.Previous>
							<KobPagination.Items />
							<KobPagination.Next class="h-9 w-9 flex items-center justify-center text-body hover:bg-secondary-base hover:text-secondary-contrast duration-200 transition-colors disabled:opacity-50 bg-card-base">
								<FaSolidChevronRight size={14} />
							</KobPagination.Next>
						</KobPagination.Root>
					</Show>
				</div>
			</footer>
		</Show>
	);
};

export default Pagination;
