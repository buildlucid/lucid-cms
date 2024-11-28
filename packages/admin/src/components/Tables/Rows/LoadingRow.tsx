import { type Component, Index, Show } from "solid-js";
import { Td } from "@/components/Groups/Table";

interface LoadingRowProps {
	columns: number;
	isSelectable: boolean;
	includes: boolean[];
}

const LoadingRow: Component<LoadingRowProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<tr class="bg-container-3">
			<Show when={props.isSelectable}>
				<Td
					options={{
						width: 65,
					}}
				>
					<div class="w-full h-5 skeletone" />
				</Td>
			</Show>
			<Index each={Array.from({ length: props.columns })}>
				{(_, i) => (
					<Td
						options={{
							include: props.includes[i],
						}}
					>
						<div class="w-full h-5 skeleton" />
					</Td>
				)}
			</Index>
			<Td
				options={{
					noMinWidth: true,
				}}
			>
				<div class="w-full h-5 skeleton" />
			</Td>
		</tr>
	);
};

export default LoadingRow;
