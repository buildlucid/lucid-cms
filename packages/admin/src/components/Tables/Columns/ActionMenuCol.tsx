import { type Component, Switch, Match } from "solid-js";
import ActionDropdown, {
	type ActionDropdownProps,
} from "@/components/Partials/ActionDropdown";
import { Td } from "@/components/Groups/Table";

interface ActionMenuColProps {
	actions: ActionDropdownProps["actions"];
}

const ActionMenuCol: Component<ActionMenuColProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.actions.length > 0}>
				<Td
					classes={
						"row-actions-td text-right sticky right-0 bg-container-3 pointer-events-none"
					}
					options={{
						noMinWidth: true,
					}}
				>
					<ActionDropdown actions={props.actions} />
				</Td>
			</Match>
			<Match when={props.actions.length === 0}>
				<Td
					options={{
						noMinWidth: true,
					}}
				/>
			</Match>
		</Switch>
	);
};

export default ActionMenuCol;
