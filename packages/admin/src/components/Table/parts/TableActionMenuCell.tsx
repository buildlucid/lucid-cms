import { type Component, Match, Switch } from "solid-js";
import ActionMenu, {
	type ActionMenuProps,
} from "@/components/ActionMenu/ActionMenu";
import TableCell from "@/components/Table/parts/TableCell";

interface TableActionMenuCellProps {
	actions: ActionMenuProps["actions"];
}

const TableActionMenuCell: Component<TableActionMenuCellProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.actions.length > 0}>
				<TableCell
					noMinWidth
					class="row-actions-td text-right sticky right-0 pointer-events-none"
				>
					<ActionMenu actions={props.actions} />
				</TableCell>
			</Match>
			<Match when={props.actions.length === 0}>
				<TableCell noMinWidth />
			</Match>
		</Switch>
	);
};

export default TableActionMenuCell;
