import classNames from "classnames";
import { FaSolidArrowsRotate, FaSolidXmark } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	type JSX,
	Show,
} from "solid-js";
import { CheckboxButton } from "@/components/Groups/Form/CheckboxButton";
import type { FilterProps } from "@/components/Groups/Query/Filter";
import type { SortProps } from "@/components/Groups/Query/Sort";
import Button from "@/components/Partials/Button";
import type { QueryStateResponse } from "@/hooks/useQueryState";
import T from "@/translations";
import { Filter } from "./Filter";
import { PerPage } from "./PerPage";
import { Sort } from "./Sort";

interface QueryRowProps {
	filters?: FilterProps["filters"];
	sorts?: SortProps["sorts"];
	perPage?: Array<number>;
	custom?: JSX.Element;
	searchParams: QueryStateResponse;
	onRefresh?: () => void;
	showingDeleted?: Accessor<boolean>;
	setShowingDeleted?: (value: boolean) => void;
	options?: {
		padding?: "16" | "24";
	};
}

export const QueryRow: Component<QueryRowProps> = (props) => {
	// ----------------------------------------
	// State
	const [isRefreshing, setIsRefreshing] = createSignal(false);

	// ----------------------------------------
	// Memos
	const showRefreshButton = createMemo(() => {
		return props.onRefresh !== undefined;
	});

	// ----------------------------------------
	// Functions
	const handleRefresh = () => {
		setIsRefreshing(true);
		props.onRefresh?.();
		setTimeout(() => {
			setIsRefreshing(false);
		}, 1000);
	};

	// ----------------------------------------
	// Render
	return (
		<div
			class={classNames("w-full flex flex-wrap justify-between gap-2.5", {
				"px-4 pb-4": props.options?.padding === "16",
				"px-4 md:px-6 pb-4 md:pb-6":
					props.options?.padding === "24" ||
					props.options?.padding === undefined,
			})}
		>
			<div class="flex flex-wrap gap-2.5 items-center">
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
						props.showingDeleted !== undefined &&
						props.setShowingDeleted !== undefined
					}
				>
					<CheckboxButton
						id="isDeleted"
						value={props.showingDeleted?.() ?? false}
						onChange={(value) => {
							props.setShowingDeleted?.(value);
						}}
						name={"isDeleted"}
						copy={{
							label: T()("media.deleted.show"),
						}}
						theme="error"
					/>
				</Show>
				<Show
					when={
						props.filters !== undefined &&
						!props.searchParams.hasDefaultFiltersApplied()
					}
				>
					<button
						type="button"
						class={classNames(
							"z-20 relative text-sm flex items-center gap-1.5 hover:text-error-hover duration-200 transition-colors group",
							"md:ml-2",
						)}
						onClick={(e) => {
							e.stopPropagation();
							e.preventDefault();
							props.searchParams.resetFilters();
						}}
					>
						<FaSolidXmark class="text-error-base group-hover:text-error-hover" />
						<span>{T()("actions.reset.filters")}</span>
					</button>
				</Show>
			</div>
			<div class="flex flex-wrap gap-2.5 items-center md:justify-end">
				<Show when={showRefreshButton()}>
					<Button
						theme="border-outline"
						size="icon"
						type="button"
						onClick={handleRefresh}
						disabled={isRefreshing()}
						aria-label={T()("common.refresh")}
					>
						<FaSolidArrowsRotate
							size={12}
							class={classNames({
								"animate-spin": isRefreshing(),
							})}
						/>
					</Button>
				</Show>
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
