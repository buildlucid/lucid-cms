import classNames from "classnames";
import { FaSolidCaretUp, FaSolidMinus } from "solid-icons/fa";
import {
	type Component,
	createMemo,
	type JSXElement,
	Match,
	Show,
	Switch,
} from "solid-js";
import { useTableContext } from "@/components/Table/TableContext";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";

interface TableHeaderCellProps {
	/** Head key this cell belongs to, and the sort key it reads and writes. */
	column?: string;
	label?: string;
	icon?: JSXElement;
	queryState?: QueryStateResponse;
	sortable?: boolean;
	width?: number;
	minWidth?: number;
	class?: string;
	children?: JSXElement;
}

const TableHeaderCell: Component<TableHeaderCellProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const table = useTableContext();

	// ----------------------------------
	// Memos
	const sort = createMemo(() => {
		if (props.queryState === undefined) return undefined;
		if (props.sortable === false) return undefined;
		if (props.column === undefined) return undefined;

		return props.queryState.sorts().get(props.column);
	});
	const sortFull = createMemo(() => {
		if (sort() === undefined) return undefined;
		if (sort() === "asc") return "ascending";
		if (sort() === "desc") return "descending";
	});

	// ----------------------------------------
	// Render
	return (
		<Show when={table.isColumnVisible(props.column)}>
			<th
				data-table-header-cell
				data-column={props.column}
				class={classNames(
					"text-left relative gap-2.5 px-4 bg-clip-padding border-b border-border duration-200 transition-colors whitespace-nowrap",
					{
						"hover:bg-card":
							props.sortable &&
							(table.variant() === "primary" || table.variant() === undefined),
						"hover:bg-card-hover":
							props.sortable &&
							(table.variant() === "secondary" ||
								table.variant() === "contained"),
						"bg-background":
							table.variant() === "primary" || table.variant() === undefined,
						"bg-card": table.variant() === "secondary",
						"bg-input": table.variant() === "contained",
						"first:pl-4 md:first:pl-6 last:pr-4 md:last:pr-6":
							table.padding() === "md",
					},
					props.class,
				)}
				style={{
					width: props.width ? `${props.width}px` : undefined,
					"min-width": props.minWidth ? `${props.minWidth}px` : undefined,
				}}
				aria-sort={sortFull()}
			>
				<Switch>
					<Match when={props.label !== undefined}>
						<Switch>
							<Match when={props.sortable !== true}>
								<div class="flex items-center min-h-12.5 gap-2.5">
									<span class="text-sm fill-body">{props.icon}</span>
									<span class="text-sm text-body">{props.label}</span>
								</div>
							</Match>
							<Match when={props.sortable === true}>
								<button
									class="justify-between gap-2.5 flex items-center w-full min-h-12.5"
									onClick={() => {
										if (props.queryState === undefined) return;
										if (props.column === undefined) return;

										let sortValue: "asc" | "desc" | undefined;
										if (sort() === undefined) {
											sortValue = "asc";
										} else if (sort() === "asc") {
											sortValue = "desc";
										} else if (sort() === "desc") {
											sortValue = undefined;
										}

										props.queryState.setSort(props.column, sortValue);
									}}
									type="button"
								>
									<div class="flex items-center gap-2.5">
										<span class="text-sm fill-body">{props.icon}</span>
										<span class="text-sm text-body">{props.label}</span>
									</div>
									<Switch>
										<Match when={sort() === "desc" || sort() === "asc"}>
											<FaSolidCaretUp
												aria-hidden="true"
												class={classNames("w-3 h-3 text-icon", {
													"transform rotate-180": sort() === "desc",
												})}
											/>
										</Match>
										<Match when={sort() === undefined}>
											<FaSolidMinus
												aria-hidden="true"
												class="w-3 h-3 text-icon ml-2"
											/>
										</Match>
									</Switch>
								</button>
							</Match>
						</Switch>
					</Match>
					<Match when={props.children !== undefined}>{props.children}</Match>
				</Switch>
			</th>
		</Show>
	);
};

export default TableHeaderCell;
