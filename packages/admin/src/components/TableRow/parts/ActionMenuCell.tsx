import { type Component, Match, Switch } from "solid-js";
import ActionDropdown, {
	type ActionDropdownProps,
} from "@/components/ActionDropdown/ActionDropdown";
import { TableCell } from "@/components/TableCell/TableCell";

interface ActionMenuColProps {
	actions: ActionDropdownProps["actions"];
	padding?: "16" | "24";
	raised?: boolean;
}

const ActionMenuCell: Component<ActionMenuColProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.actions.length > 0}>
				<TableCell
					classes={
						"row-actions-td text-right sticky right-0 pointer-events-none"
					}
					options={{
						noMinWidth: true,
						padding: props.padding,
					}}
				>
					<ActionDropdown
						actions={props.actions}
						options={{ raised: props.raised ?? false }}
					/>
				</TableCell>
			</Match>
			<Match when={props.actions.length === 0}>
				<TableCell
					options={{
						noMinWidth: true,
					}}
				/>
			</Match>
		</Switch>
	);
};

export default ActionMenuCell;
