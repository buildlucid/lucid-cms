import T from "@/translations";
import { type Component, Show, type JSX } from "solid-js";
import { FaSolidXmark } from "solid-icons/fa";
import classNames from "classnames";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import type { FilterProps } from "@/components/Groups/Query/Filter";
import type { SortProps } from "@/components/Groups/Query/Sort";
import { PerPage, Filter, Sort } from "@/components/Groups/Query";

interface QueryRowProps {
	filters?: FilterProps["filters"];
	sorts?: SortProps["sorts"];
	perPage?: Array<number>;
	custom?: JSX.Element;
	searchParams: ReturnType<typeof useSearchParamsLocation>;
}

export const QueryRow: Component<QueryRowProps> = (props) => {
	return (
		<div class="w-full px-4 md:px-6 pb-4 md:pb-6 flex justify-between">
			<div class="flex gap-2.5 items-center">
				<Show when={props.filters !== undefined}>
					<Filter
						filters={props.filters as FilterProps["filters"]}
						searchParams={props.searchParams}
						disabled={props.filters?.length === 0}
					/>
				</Show>
				<Show when={props.sorts !== undefined}>
					<Sort
						sorts={props.sorts as SortProps["sorts"]}
						searchParams={props.searchParams}
					/>
				</Show>
				<Show when={props.custom !== undefined}>{props.custom}</Show>
				<Show
					when={
						props.filters !== undefined &&
						!props.searchParams.hasDefaultFiltersApplied()
					}
				>
					<button
						type="button"
						class={classNames(
							"z-20 relative text-sm flex items-center gap-1.5 ml-2 hover:text-error-hover duration-200 transition-colors group",
						)}
						onClick={(e) => {
							e.stopPropagation();
							e.preventDefault();
							props.searchParams.resetFilters();
						}}
					>
						<FaSolidXmark class="text-error-base group-hover:text-error-hover" />
						<span>{T()("reset_filters")}</span>
					</button>
				</Show>
			</div>
			<div>
				<Show when={props.perPage !== undefined}>
					<PerPage
						options={props.perPage?.length === 0 ? undefined : props.perPage}
						searchParams={props.searchParams}
					/>
				</Show>
			</div>
		</div>
	);
};
