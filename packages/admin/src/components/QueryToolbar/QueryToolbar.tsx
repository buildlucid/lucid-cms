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
	type FilterPreset,
} from "@/components/FilterPanel/FilterPanel";
import FilterToggle from "@/components/FilterToggle/FilterToggle";
import PerPageSelect from "@/components/PerPageSelect/PerPageSelect";
import QuerySort, {
	type QuerySortProps,
} from "@/components/QuerySort/QuerySort";
import ResetFilters from "@/components/ResetFilters/ResetFilters";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import T from "@/translations";

export type QueryToolbarPadding = "sm" | "md";

export interface QueryToolbarProps {
	queryState: QueryStateResponse;
	/** Adds a filter button and panel. */
	filterFields?: FilterField[];
	/** What is being filtered, shown in the filter panel's heading. */
	filterSubject?: string;
	/** Shows `filterSubject` as given, instead of sentence case. */
	preserveFilterSubjectCase?: boolean;
	filterPresets?: FilterPreset[];
	/** Controls whether the filter panel is open. */
	filtersOpen?: boolean;
	onFiltersOpenChange?: (_open: boolean) => void;
	/** Adds a sort menu. */
	sorts?: QuerySortProps["sorts"];
	/** Adds a page size menu. Pass `true` for the default sizes. */
	perPage?: boolean | number[];
	/** Adds a refresh button. */
	onRefresh?: () => void;
	/** Replaces the default filter reset. */
	onResetFilters?: () => void;
	/** Adds a "show deleted" checkbox. Requires `onShowDeletedChange`. */
	showDeleted?: boolean;
	onShowDeletedChange?: (_value: boolean) => void;
	/** @default "md" */
	padding?: QueryToolbarPadding;
	/** Adds padding above the toolbar. */
	paddingTop?: boolean;
	class?: string;
	/** Extra controls, shown after the sort menu. */
	children?: JSXElement;
}

/**
 * Filter, sort and page size controls for a list.
 *
 * @example
 * ```tsx
 * import { QueryToolbar } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<QueryToolbar
 * 		queryState={queryState}
 * 		filterSubject={t("redirects.title")}
 * 		filterFields={[{ key: "from", label: t("redirects.from"), type: "text" }]}
 * 		sorts={[{ key: "createdAt", label: t("common.created.at") }]}
 * 		perPage
 * 		onRefresh={() => redirects.refetch()}
 * 	/>
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
							props.showDeleted !== undefined &&
							props.onShowDeletedChange !== undefined
						}
					>
						<Checkbox
							variant="button-danger"
							id="isDeleted"
							value={props.showDeleted ?? false}
							onChange={(value) => {
								props.onShowDeletedChange?.(value);
							}}
							name={"isDeleted"}
							label={T()("actions.show.deleted")}
						/>
					</Show>
					<Show
						when={
							(filterFields() !== undefined ||
								props.onResetFilters !== undefined) &&
							!props.queryState.filtersAreDefault()
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
