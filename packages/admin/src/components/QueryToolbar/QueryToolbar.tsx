import classNames from "classnames";
import { FaSolidArrowsRotate } from "solid-icons/fa";
import {
	type Component,
	createMemo,
	createSignal,
	type JSXElement,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import Checkbox from "@/components/Checkbox/Checkbox";
import FilterPanel, {
	type FilterField,
	type FilterPresets,
} from "@/components/FilterPanel/FilterPanel";
import FilterToggle from "@/components/FilterToggle/FilterToggle";
import PerPageSelect from "@/components/PerPageSelect/PerPageSelect";
import QuerySort, {
	type QuerySortProps,
} from "@/components/QuerySort/QuerySort";
import ResetFilters from "@/components/ResetFilters/ResetFilters";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import T from "@/translations";

/** Space a toolbar leaves at its edges. */
export type QueryToolbarPadding = "sm" | "md";

export interface QueryToolbarProps {
	/** The state every control in the toolbar reads and writes. */
	queryState: QueryStateResponse;
	/** Adds a filter button, and the panel it opens beneath the toolbar. */
	filterFields?: FilterField[];
	/** Names the thing being filtered, for the panel's heading. */
	filterSubject?: string;
	/** Keeps the subject's capitalisation instead of lowercasing it. */
	preserveFilterSubjectCase?: boolean;
	/** One-click filter combinations, shown above the rows. */
	filterPresets?: FilterPresets;
	/** Takes the panel's open state over. It manages its own otherwise. */
	filtersOpen?: boolean;
	onFiltersOpenChange?: (_open: boolean) => void;
	/** Adds a sort menu over these keys. */
	sorts?: QuerySortProps["sorts"];
	/** Adds a page-size menu. Pass sizes of your own, or true for the defaults. */
	perPage?: boolean | number[];
	/** Adds a refresh button that calls this. */
	onRefresh?: () => void;
	/** Replaces what the reset link does. It clears the filters by default. */
	onResetFilters?: () => void;
	/** Adds a "show deleted" checkbox. Needs `onShowingDeletedChange`. */
	showingDeleted?: boolean;
	onShowingDeletedChange?: (_value: boolean) => void;
	/** Space the toolbar leaves at its edges. @default "md" */
	padding?: QueryToolbarPadding;
	/**
	 * Pads the top to match. Leave it off when a page header sits directly
	 * above, which is how the admin's own lists use it. @default false
	 */
	paddingTop?: boolean;
	class?: string;
	/** Controls of your own, after the sort menu. */
	children?: JSXElement;
}

/**
 * The row of filter, sort and page-size controls that sits above a list, and
 * the filter panel it opens. Drive a Table or Grid from the same query state.
 *
 * @example
 * ```tsx
 * import { QueryToolbar, Table } from "@lucidcms/admin/components";
 * import { useQueryState, useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 * const queryState = useQueryState();
 *
 * return (
 * 	<>
 * 		<QueryToolbar
 * 			queryState={queryState}
 * 			filterSubject={t("admin:reports.title")}
 * 			filterFields={[{ key: "name", label: t("common.name"), type: "text" }]}
 * 			sorts={[{ key: "createdAt", label: t("common.created.at") }]}
 * 			perPage
 * 		/>
 * 		<Table.Root {...tableProps} />
 * 	</>
 * );
 * ```
 */
const QueryToolbar: Component<QueryToolbarProps> = (props) => {
	// ----------------------------------------
	// State
	const [isRefreshing, setIsRefreshing] = createSignal(false);
	const [internalFilterPanelOpen, setInternalFilterPanelOpen] =
		createSignal(false);

	// ----------------------------------------
	// Memos
	const filterFields = createMemo(() => props.filterFields);
	const filterPanelOpen = createMemo(
		() => props.filtersOpen ?? internalFilterPanelOpen(),
	);
	const perPageOptions = createMemo(() =>
		Array.isArray(props.perPage) && props.perPage.length > 0
			? props.perPage
			: undefined,
	);

	// ----------------------------------------
	// Functions
	const handleRefresh = () => {
		setIsRefreshing(true);
		props.onRefresh?.();
		setTimeout(() => {
			setIsRefreshing(false);
		}, 1000);
	};
	const setFilterPanelOpen = (open: boolean) => {
		if (props.onFiltersOpenChange) props.onFiltersOpenChange(open);
		else setInternalFilterPanelOpen(open);
	};

	// ----------------------------------------
	// Render
	return (
		<div
			data-query-toolbar
			class={classNames(
				"w-full flex flex-col gap-2.5",
				{
					"px-4 pb-4": props.padding === "sm",
					"px-4 md:px-6 pb-4 md:pb-6": props.padding !== "sm",
					"pt-4": props.paddingTop && props.padding === "sm",
					"pt-4 md:pt-6": props.paddingTop && props.padding !== "sm",
				},
				props.class,
			)}
		>
			<div class="w-full flex flex-wrap justify-between gap-2.5">
				<div class="flex flex-wrap gap-2.5 items-center">
					<Show when={filterFields()}>
						{(fields) => (
							<FilterToggle
								open={filterPanelOpen()}
								onOpenChange={setFilterPanelOpen}
								queryState={props.queryState}
								disabled={fields().length === 0}
							/>
						)}
					</Show>
					<Show when={props.sorts !== undefined}>
						<QuerySort
							sorts={props.sorts as QuerySortProps["sorts"]}
							queryState={props.queryState}
						/>
					</Show>
					{props.children}
					<Show
						when={
							props.showingDeleted !== undefined &&
							props.onShowingDeletedChange !== undefined
						}
					>
						<Checkbox
							variant="button-danger"
							id="isDeleted"
							value={props.showingDeleted ?? false}
							onChange={(value) => {
								props.onShowingDeletedChange?.(value);
							}}
							name={"isDeleted"}
							label={T()("actions.show.deleted")}
						/>
					</Show>
					<Show
						when={
							(filterFields() !== undefined ||
								props.onResetFilters !== undefined) &&
							!props.queryState.hasDefaultFiltersApplied()
						}
					>
						<ResetFilters
							onReset={() => {
								if (props.onResetFilters) props.onResetFilters();
								else props.queryState.resetFilters();
							}}
						/>
					</Show>
				</div>
				<div class="flex flex-wrap gap-2.5 items-center md:justify-end">
					<Show when={props.onRefresh !== undefined}>
						<Button
							variant="outline"
							size="sm"
							shape="square"
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
					<Show when={props.perPage !== undefined && props.perPage !== false}>
						<PerPageSelect
							options={perPageOptions()}
							queryState={props.queryState}
						/>
					</Show>
				</div>
			</div>
			<Show when={filterFields()}>
				{(fields) => (
					<FilterPanel
						open={filterPanelOpen()}
						onOpenChange={setFilterPanelOpen}
						subject={props.filterSubject ?? ""}
						fields={fields()}
						queryState={props.queryState}
						preserveSubjectCase={props.preserveFilterSubjectCase}
						presets={props.filterPresets}
						padding={props.padding ?? "md"}
					/>
				)}
			</Show>
		</div>
	);
};

export default QueryToolbar;
