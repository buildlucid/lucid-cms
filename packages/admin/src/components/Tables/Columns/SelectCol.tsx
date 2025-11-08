import { type Component, Switch, Match } from "solid-js";
import { Td, Th } from "@/components/Groups/Table";
import { Checkbox } from "@/components/Groups/Form";
import type { TableTheme } from "@/components/Groups/Table/Table";

interface SelectColProps {
	type?: "th" | "td";
	value: boolean;
	onChange: (_value: boolean) => void;
	theme?: TableTheme;
	padding?: "16" | "24";
}

const SelectCol: Component<SelectColProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.type === "th"}>
				<Th
					options={{
						width: 65,
						padding: props.padding,
					}}
					theme={props.theme}
				>
					<Checkbox
						value={props.value}
						onChange={props.onChange}
						copy={{}}
						noMargin={true}
					/>
				</Th>
			</Match>
			<Match when={props.type === "td"}>
				<Td
					options={{
						width: 65,
						padding: props.padding,
					}}
				>
					<Checkbox
						value={props.value}
						onChange={props.onChange}
						copy={{}}
						noMargin={true}
					/>
				</Td>
			</Match>
		</Switch>
	);
};

export default SelectCol;
