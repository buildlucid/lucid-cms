import classNames from "classnames";
import { FaSolidArrowsRotate } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	type JSX,
	Show,
} from "solid-js";
import { CheckboxButton } from "@/components/Groups/Form/CheckboxButton";
import {
	FilterSection,
	type FilterSectionProps,
	FilterSectionToggle,
} from "@/components/Groups/Query/FilterSection";
import type { SortProps } from "@/components/Groups/Query/Sort";
import Button from "@/components/Partials/Button";
import type { QueryStateResponse } from "@/hooks/useQueryState";
import T from "@/translations";
import { PerPage } from "./PerPage";
import { ResetFilters } from "./ResetFilters";
import { Sort } from "./Sort";

interface QueryRowProps {
	filterSection?: Omit<
		FilterSectionProps,
		"searchParams" | "open" | "setOpen" | "parentPadding"
	> &
		Partial<Pick<FilterSectionProps, "open" | "setOpen">>;
	sorts?: SortProps["sorts"];
	perPage?: Array<number>;
	custom?: JSX.Element;
	searchParams: QueryStateResponse;
	//* overrides the reset button behaviour
	onResetFilters?: () => void;
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
	const [internalFilterSectionOpen, setInternalFilterSectionOpen] =
		createSignal(false);

	// ----------------------------------------
	// Memos
	const showRefreshButton = createMemo(() => {
		return props.onRefresh !== undefined;
	});
	const filterSection = createMemo(() => props.filterSection);
	const filterSectionOpen = createMemo(
		() => filterSection()?.open ?? internalFilterSectionOpen(),
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
	const setFilterSectionOpen = (open: boolean) => {
		const setter = filterSection()?.setOpen;
		if (setter) setter(open);
		else setInternalFilterSectionOpen(open);
	};

	// ----------------------------------------
	// Render
	return (
		<div
			class={classNames("w-full flex flex-col gap-2.5", {
				"px-4 pb-4": props.options?.padding === "16",
				"px-4 md:px-6 pb-4 md:pb-6":
					props.options?.padding === "24" ||
					props.options?.padding === undefined,
			})}
		>
			<div class="w-full flex flex-wrap justify-between gap-2.5">
				<div class="flex flex-wrap gap-2.5 items-center">
					<Show when={filterSection()}>
						{(section) => (
							<FilterSectionToggle
								open={filterSectionOpen()}
								onToggle={() => setFilterSectionOpen(!filterSectionOpen())}
								searchParams={props.searchParams}
								disabled={section().fields.length === 0}
							/>
						)}
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
							(filterSection() !== undefined ||
								props.onResetFilters !== undefined) &&
							!props.searchParams.hasDefaultFiltersApplied()
						}
					>
						<ResetFilters
							onReset={() => {
								if (props.onResetFilters) props.onResetFilters();
								else props.searchParams.resetFilters();
							}}
						/>
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
			<Show when={filterSection()}>
				{(section) => (
					<FilterSection
						open={filterSectionOpen()}
						setOpen={setFilterSectionOpen}
						subject={section().subject}
						fields={section().fields}
						searchParams={props.searchParams}
						embedded={section().embedded}
						preserveSubjectCase={section().preserveSubjectCase}
						parentPadding={props.options?.padding ?? "24"}
					/>
				)}
			</Show>
		</div>
	);
};
