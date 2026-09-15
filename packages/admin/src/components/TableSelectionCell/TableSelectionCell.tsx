import { type Component, Match, Switch } from "solid-js";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import type { TableTheme } from "@/components/Table/Table";
import { TableCell } from "@/components/TableCell/TableCell";
import { TableHeaderCell } from "@/components/TableHeaderCell/TableHeaderCell";

interface SelectColProps {
	type?: "th" | "td";
	value: boolean;
	onChange: (_value: boolean) => void;
	theme?: TableTheme;
	padding?: "16" | "24";
}

const TableSelectionCell: Component<SelectColProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.type === "th"}>
				<TableHeaderCell
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
				</TableHeaderCell>
			</Match>
			<Match when={props.type === "td"}>
				<TableCell
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
				</TableCell>
			</Match>
		</Switch>
	);
};

export default TableSelectionCell;
