import classNames from "classnames";
import { FaSolidFilter } from "solid-icons/fa";
import type { Component } from "solid-js";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import T from "@/translations";

export interface FilterToggleProps {
	open: boolean;
	onOpenChange: (_open: boolean) => void;
	/** Highlights the button while filters are applied. */
	queryState: QueryStateResponse;
	/** Overrides when the button reads as active. */
	active?: boolean;
	disabled?: boolean;
	class?: string;
}

/**
 * The button that opens a FilterPanel. It highlights itself while the list is
 * filtered, so people can see the results are narrowed.
 *
 * @example
 * ```tsx
 * import { FilterToggle } from "@lucidcms/admin/components";
 *
 * const [open, setOpen] = createSignal(false);
 *
 * return (
 * 	<FilterToggle open={open()} onOpenChange={setOpen} queryState={queryState} />
 * );
 * ```
 */
const FilterToggle: Component<FilterToggleProps> = (props) => {
	const active = () =>
		props.active ?? !props.queryState.hasDefaultFiltersApplied();

	// -----------------------------
	// Render
	return (
		<button
			type="button"
			data-filter-toggle
			class={classNames(
				"gap-2 pl-2 pr-3 h-9 text-sm border border-transparent rounded-md flex items-center outline-primary-base focus:outline-1 disabled:cursor-not-allowed disabled:text-unfocused disabled:fill-unfocused duration-200 transition-colors",
				{
					"bg-primary-base hover:bg-primary-hover text-primary-contrast fill-primary-contrast":
						props.open || active(),
					"bg-secondary-base hover:bg-secondary-hover text-secondary-contrast":
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
