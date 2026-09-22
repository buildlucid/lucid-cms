import { FaSolidTable } from "solid-icons/fa";
import { type Component, For } from "solid-js";
import Menu from "@/components/Menu/Menu";
import T from "@/translations";

interface TableColumnToggleProps {
	columns: Array<{
		index: number;
		label: string;
		include: boolean;
	}>;
	onToggle: (_index: number) => void;
}

const TableColumnToggle: Component<TableColumnToggleProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Menu.Root placement="bottom-end">
			<Menu.Trigger class="w-7 h-7 bg-background outline-none ring-0 focus-visible:ring-1 focus:ring-primary rounded-md flex justify-center items-center hover:bg-background-hover">
				<span class="sr-only">{T()("tables.columns.visibility.toggle")}</span>
				<FaSolidTable class="text-body" size={14} />
			</Menu.Trigger>
			<Menu.Content>
				<For each={props.columns}>
					{(column) => (
						<Menu.CheckboxItem
							checked={column.include}
							onChange={() => props.onToggle(column.index)}
							textValue={column.label}
						>
							{column.label}
						</Menu.CheckboxItem>
					)}
				</For>
			</Menu.Content>
		</Menu.Root>
	);
};

export default TableColumnToggle;
