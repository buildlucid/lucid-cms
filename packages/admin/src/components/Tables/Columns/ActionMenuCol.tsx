import { type Component, Match, Switch } from "solid-js";
import { Td } from "@/components/Groups/Table";
import ActionDropdown, {
	type ActionDropdownProps,
} from "@/components/Partials/ActionDropdown";

interface ActionMenuColProps {
	actions: ActionDropdownProps["actions"];
	padding?: "16" | "24";
	raised?: boolean;
}

const ActionMenuCol: Component<ActionMenuColProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.actions.length > 0}>
				<Td
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
