import { type Component, Match, Switch } from "solid-js";
import Pill, { type PillProps } from "@/components/Pill/Pill";
import { TableCell } from "@/components/TableCell/TableCell";

interface PillColProps {
	text?: string | number | null;
	theme?: PillProps["theme"];
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}

const TablePillCell: Component<PillColProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<TableCell
			options={{
				include: props?.options?.include,
				padding: props?.options?.padding,
			}}
		>
			<Switch>
				<Match when={props.text !== undefined}>
					<Pill theme={props.theme || "grey"}>{props.text}</Pill>
				</Match>
				<Match when={props.text === undefined}>{"-"}</Match>
			</Switch>
		</TableCell>
	);
};

export default TablePillCell;
