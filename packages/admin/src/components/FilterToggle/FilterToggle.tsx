import classNames from "classnames";
import { FaSolidFilter } from "solid-icons/fa";
import type { Component } from "solid-js";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import T from "@/translations";

export interface FilterToggleProps {
	open: boolean;
	onOpenChange: (_open: boolean) => void;
	/** Used to highlight the button when filters are applied. */
	queryState: QueryStateResponse;
	/** Overrides the highlighted state. */
	active?: boolean;
	disabled?: boolean;
	class?: string;
}

/**
 * A button that opens and closes a filter panel. It is highlighted when
 * filters are applied.
 *
 * @example
 * ```tsx
 * import { FilterToggle } from "@lucidcms/admin/components";
 *
 * return <FilterToggle open={filtersOpen()} onOpenChange={setFiltersOpen} queryState={queryState} />;
 * ```
 */
const FilterToggle: Component<FilterToggleProps> = (props) => {
	const active = () => props.active ?? !props.queryState.filtersAreDefault();

	// -----------------------------
	// Render
	return (
		<button
			type="button"
			data-filter-toggle
			class={classNames(
				"gap-2 pl-2 pr-3 h-9 text-sm border border-transparent rounded-md flex items-center outline-primary focus:outline-1 disabled:cursor-not-allowed disabled:text-muted disabled:fill-muted duration-200 transition-colors",
				{
					"bg-primary hover:bg-primary-hover text-primary-foreground fill-primary-foreground":
						props.open || active(),
					"bg-secondary hover:bg-secondary-hover text-secondary-foreground":
						!props.open && !active(),
				},
				props.class,
			)}
			aria-expanded={props.open}
			disabled={props.disabled}
			onClick={() => props.onOpenChange(!props.open)}
		>
			<FaSolidFilter />
			<span>{T()("common.filter")}</span>
		</button>
	);
};

export default FilterToggle;
