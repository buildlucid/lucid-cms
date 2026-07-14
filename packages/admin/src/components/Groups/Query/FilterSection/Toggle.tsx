import classNames from "classnames";
import { FaSolidFilter } from "solid-icons/fa";
import type { Component } from "solid-js";
import type { QueryStateResponse } from "@/hooks/useQueryState";
import T from "@/translations";

/** Query-row button that toggles the full-width filter section. */
export const FilterSectionToggle: Component<{
	open: boolean;
	onToggle: () => void;
	searchParams: QueryStateResponse;
	active?: boolean;
	disabled?: boolean;
}> = (props) => {
	const active = () =>
		props.active ?? !props.searchParams.hasDefaultFiltersApplied();

	// -----------------------------
	// Render
	return (
		<button
			type="button"
			class={classNames(
				"dropdown-trigger gap-2 pl-2 pr-3 h-9 text-sm border border-transparent rounded-md flex items-center disabled:cursor-not-allowed disabled:text-unfocused disabled:fill-unfocused duration-200 transition-colors",
				{
					"bg-primary-base hover:bg-primary-hover text-primary-contrast fill-primary-contrast":
						props.open || active(),
					"bg-secondary-base hover:bg-secondary-hover text-secondary-contrast":
						!props.open && !active(),
				},
			)}
			aria-expanded={props.open}
			disabled={props.disabled}
			onClick={props.onToggle}
		>
			<FaSolidFilter />
			<span>{T()("common.filter")}</span>
		</button>
	);
};
