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

export const SimplifiedPagination: Component<{
	state: {
		meta?: ResponseBody<unknown>["meta"];
		searchParams: ReturnType<typeof useSearchParamsLocation>;
	};
}> = (props) => {
	const [page, setPage] = createSignal(1);

	const textData = createMemo(() => ({
		page: props.state.meta?.currentPage ?? 1,
		lastPage: props.state.meta?.lastPage ?? 1,
		total: props.state.meta?.total ?? 0,
	}));

	const lastPage = createMemo(() => props.state.meta?.lastPage ?? 1);

	createEffect(() => {
		setPage(props.state.meta?.currentPage ?? 1);
	});

	const handlePageChange = (newPage: number) => {
		if (newPage >= 1 && newPage <= lastPage()) {
			props.state.searchParams.setParams({
				pagination: {
					page: newPage,
					perPage: props.state.meta?.perPage || undefined,
				},
			});
			setPage(newPage);
		}
	};

	return (
		<div class="flex flex-col items-start gap-4">
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
				<div class="flex border border-border rounded-md overflow-hidden w-full">
					<button
						class="h-9 w-1/2 flex items-center justify-center text-title hover:bg-primary-base hover:text-primary-contrast duration-200 transition-colors disabled:opacity-50"
						onClick={() => handlePageChange(page() - 1)}
						disabled={page() === 1}
						type="button"
					>
						<span class="sr-only">{T()("pagination_previous")}</span>
						<FaSolidChevronLeft />
					</button>
					<button
						class="h-9 w-1/2 flex items-center border-l border-border justify-center text-title hover:bg-primary-base hover:text-primary-contrast duration-200 transition-colors disabled:opacity-50"
						onClick={() => handlePageChange(page() + 1)}
						disabled={page() === lastPage()}
						type="button"
					>
						<span class="sr-only">{T()("pagination_next")}</span>
						<FaSolidChevronRight />
					</button>
				</div>
			</Show>
		</div>
	);
};
