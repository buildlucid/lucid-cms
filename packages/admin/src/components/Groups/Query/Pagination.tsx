import T from "@/translations";
import {
	type Component,
	Show,
	Switch,
	createEffect,
	createMemo,
	createSignal,
	Match,
} from "solid-js";
import { FaSolidChevronLeft, FaSolidChevronRight } from "solid-icons/fa";
import type { ResponseBody } from "@types";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import { Pagination as KobPagination } from "@kobalte/core";

export const Pagination: Component<{
	state: {
		meta?: ResponseBody<unknown>["meta"];
		searchParams: ReturnType<typeof useSearchParamsLocation>;
	};
}> = (props) => {
	const [page, setPage] = createSignal(1);

	// -------------------------------------
	// Memos
	const textData = createMemo(() => {
		return {
			page: props.state.meta?.currentPage ?? 1,
			lastPage: props.state.meta?.lastPage ?? 1,
			total: props.state.meta?.total ?? 0,
		};
	});
	const lastPage = createMemo(() => {
		return props.state.meta?.lastPage ?? 1;
	});

	// -------------------------------------
	// Effects
	createEffect(() => {
		setPage(props.state.meta?.currentPage ?? 1);
	});

	// -------------------------------------
	// Render
	return (
		<div class="flex md:flex-row flex-col justify-between md:items-center gap-2">
			<span class="text-sm text-body md:mb-0">
				<Switch>
					<Match when={textData().total === 0}>{T()("pagination_empty")}</Match>
					<Match when={textData().total > 0}>
						{T()("pagination_text", {
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
					onPageChange={(page) => {
						props.state.searchParams.setParams({
							pagination: {
								page: page,
								perPage: props.state.meta?.perPage || undefined,
							},
						});
						setPage(page);
					}}
					count={lastPage()}
					itemComponent={(props) => (
						<KobPagination.Item
							class="h-9 w-9 flex items-center justify-center data-current:bg-secondary-base data-current:text-secondary-contrast hover:bg-secondary-base hover:text-secondary-contrast duration-200 transition-colors bg-card-base"
							page={props.page}
						>
							{props.page}
						</KobPagination.Item>
					)}
					ellipsisComponent={() => (
						<KobPagination.Ellipsis class="h-9 w-9 flex items-center justify-center bg-card-base">
							...
						</KobPagination.Ellipsis>
					)}
				>
					<KobPagination.Previous class="h-9 w-9 flex items-center justify-center text-title hover:bg-secondary-base hover:text-secondary-contrast duration-200 transition-colors disabled:opacity-50 bg-card-base">
						<FaSolidChevronLeft />
					</KobPagination.Previous>
					<KobPagination.Items />
					<KobPagination.Next class="h-9 w-9 flex items-center justify-center text-title hover:bg-secondary-base hover:text-secondary-contrast duration-200 transition-colors disabled:opacity-50 bg-card-base">
						<FaSolidChevronRight />
					</KobPagination.Next>
				</KobPagination.Root>
			</Show>
		</div>
	);
};
