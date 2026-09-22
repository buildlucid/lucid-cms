import type { Component } from "solid-js";
import { Show } from "solid-js";
import Table from "@/components/Table/Table";

interface ColorCellProps {
	column?: string;
	value?: string | null;
	minWidth?: number;
}

const ColorCell: Component<ColorCellProps> = (props) => {
	const colorValue = () => props.value?.trim() || null;

	return (
		<Table.Cell column={props.column} minWidth={props.minWidth}>
			<Show when={colorValue()} fallback={<span class="text-sm">-</span>}>
				{(value) => (
					<div class="flex min-w-0 items-center gap-2" title={value()}>
						<span
							class="size-4 shrink-0 rounded-full border border-border shadow-xs"
							style={{ "background-color": value() }}
						/>
						<span class="min-w-0 truncate text-sm">{value()}</span>
					</div>
				)}
			</Show>
		</Table.Cell>
	);
};

export default ColorCell;
