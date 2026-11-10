import classNames from "classnames";
import { TbOutlineFilter, TbOutlineX } from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import Tooltip from "@/components/Tooltip/Tooltip";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import T from "@/translations";

export interface FilterToggleProps {
	open: boolean;
	onOpenChange: (_open: boolean) => void;
	/** Used to highlight the button when filters are applied. */
	queryState: QueryStateResponse;
	/** Overrides the highlighted state. */
	active?: boolean;
	/** Adds a clear button to the end of the toggle while filters are applied. */
	onReset?: () => void;
	disabled?: boolean;
	class?: string;
}

/**
 * A button that opens and closes a filter panel. It is highlighted when
 * filters are applied, and with `onReset` gains a button that clears them.
 *
 * @example
 * ```tsx
 * import { FilterToggle } from "@lucidcms/admin/components";
 *
 * return (
 * 	<FilterToggle
 * 		open={filtersOpen()}
 * 		onOpenChange={setFiltersOpen}
 * 		queryState={queryState}
 * 		onReset={queryState.resetFilters}
 * 	/>
 * );
 * ```
 */
const FilterToggle: Component<FilterToggleProps> = (props) => {
	// ----------------------------------------
	// Functions
	const active = () => props.active ?? !props.queryState.filtersAreDefault();
	const resettable = () => active() && props.onReset !== undefined;
	const tone = () =>
		props.open || active()
			? "bg-primary hover:bg-primary-hover text-primary-foreground"
			: "bg-secondary hover:bg-secondary-hover text-secondary-foreground";

	// ----------------------------------------
	// Render
	return (
		<div data-filter-toggle class={classNames("flex", props.class)}>
			<button
				type="button"
				class={classNames(
					"gap-2 pl-2 pr-3 h-8 text-sm font-medium border border-transparent flex items-center focus-ring disabled:cursor-not-allowed disabled:bg-secondary-disabled disabled:text-secondary-disabled-foreground transition-colors",
					tone(),
					resettable() ? "rounded-l-md" : "rounded-md",
				)}
				aria-expanded={props.open}
				disabled={props.disabled}
				onClick={() => props.onOpenChange(!props.open)}
			>
				<TbOutlineFilter />
				<span>{T()("common.filter")}</span>
			</button>
			<Show when={resettable()}>
				<Tooltip
					type="button"
					class={classNames(
						"flex h-8 w-7 items-center justify-center rounded-r-md border-l border-primary-foreground/20 focus-ring transition-colors",
						tone(),
					)}
					aria-label={T()("actions.reset.filters")}
					content={T()("actions.reset.filters")}
					onClick={() => props.onReset?.()}
				>
					<TbOutlineX size={12} />
				</Tooltip>
			</Show>
		</div>
	);
};

export default FilterToggle;
