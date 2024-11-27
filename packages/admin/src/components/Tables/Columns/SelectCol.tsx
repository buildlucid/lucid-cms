import { type Component, Switch, Match } from "solid-js";
import Table from "@/components/Groups/Table";
import Form from "@/components/Groups/Form";

interface SelectColProps {
	type?: "th" | "td";
	value: boolean;
	onChange: (_value: boolean) => void;
}

const SelectCol: Component<SelectColProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.type === "th"}>
				<Table.Th
					options={{
						width: 65,
					}}
				>
					<Form.Checkbox
						value={props.value}
						onChange={props.onChange}
						copy={{}}
						noMargin={true}
						theme="full"
					/>
				</Table.Th>
			</Match>
			<Match when={props.type === "td"}>
				<Table.Td
					options={{
						width: 65,
					}}
				>
					<Form.Checkbox
						value={props.value}
						onChange={props.onChange}
						copy={{}}
						noMargin={true}
						theme="full"
					/>
				</Table.Td>
			</Match>
		</Switch>
	);
};

export default SelectCol;
