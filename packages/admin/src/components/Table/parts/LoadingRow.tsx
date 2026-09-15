import classNames from "classnames";
import { type Component, Index, Show } from "solid-js";
import { TableCell } from "@/components/TableCell/TableCell";
import type { TableTheme } from "../Table";

interface LoadingRowProps {
	columns: number;
	isSelectable: boolean;
	includes: boolean[];
	theme?: TableTheme;
}

const LoadingRow: Component<LoadingRowProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<tr
			class={classNames({
				"bg-background-base":
					props.theme === "primary" || props.theme === undefined,
				"bg-card-base":
					props.theme === "secondary" || props.theme === "contained",
			})}
		>
			<Show when={props.isSelectable}>
				<TableCell
					options={{
						width: 65,
					}}
				>
					<div class="w-full h-5 skeleton" />
				</TableCell>
			</Show>
			<Index each={Array.from({ length: props.columns })}>
				{(_, i) => (
					<TableCell
						options={{
							include: props.includes[i],
						}}
					>
						<div class="w-full h-5 skeleton" />
					</TableCell>
				)}
			</Index>
			<TableCell
				options={{
					noMinWidth: true,
				}}
			>
				<div class="w-full h-5 skeleton" />
			</TableCell>
		</tr>
	);
};

export default LoadingRow;
