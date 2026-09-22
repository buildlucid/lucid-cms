import classNames from "classnames";
import { type Component, For, Show } from "solid-js";
import TableCell from "@/components/Table/parts/TableCell";
import { useTableContext } from "@/components/Table/TableContext";

interface TableLoadingRowProps {
	/** Head keys, so hidden columns are skipped the same way real rows skip them. */
	columns: string[];
	hasReorderColumn: boolean;
}

const TableLoadingRow: Component<TableLoadingRowProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const table = useTableContext();

	// ----------------------------------------
	// Render
	return (
		<tr
			class={classNames({
				"bg-background":
					table.variant() === "primary" || table.variant() === undefined,
				"bg-card":
					table.variant() === "secondary" || table.variant() === "contained",
			})}
		>
			<Show when={props.hasReorderColumn}>
				<TableCell width={40} minWidth={false}>
					<div class="w-full h-5 skeleton" />
				</TableCell>
			</Show>
			<Show when={table.isSelectable()}>
				<TableCell width={65}>
					<div class="w-full h-5 skeleton" />
				</TableCell>
			</Show>
			<For each={props.columns}>
				{(column) => (
					<TableCell column={column}>
						<div class="w-full h-5 skeleton" />
					</TableCell>
				)}
			</For>
			<TableCell minWidth={false}>
				<div class="w-full h-5 skeleton" />
			</TableCell>
		</tr>
	);
};

export default TableLoadingRow;
