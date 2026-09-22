import {
	type Accessor,
	createContext,
	type JSXElement,
	useContext,
} from "solid-js";

export type TableVariant = "primary" | "secondary" | "contained";

export type TablePadding = "sm" | "md";

export interface TableColumn {
	/** Matches the cells' `column` prop, and is used as the sort key. */
	key: string;
	label: string;
	icon?: JSXElement;
	/** Requires `queryState` on `Table.Root`. */
	sortable?: boolean;
	width?: number;
	minWidth?: number;
}

export interface TableRowReorder {
	enabled: boolean;
	draggingIndex: number | null;
	dropTargetIndex: number | null;
	onDragStart: (_index: number, _e: DragEvent) => void;
	onDragEnd: (_e: DragEvent) => void;
	onDragEnter: (_index: number, _e: DragEvent) => void;
	onDragOver: (_e: DragEvent) => void;
}

export interface TableContextValue {
	padding: Accessor<TablePadding>;
	variant: Accessor<TableVariant | undefined>;
	isSelectable: Accessor<boolean>;
	isColumnVisible: (_key: string | undefined) => boolean;
	isRowSelected: (_index: number) => boolean;
	toggleRowSelected: (_index: number) => void;
	rowReorder: TableRowReorder;
}

export const TableContext = createContext<TableContextValue>();

/** Reads the state Table.Root shares with its rows and cells. */
export const useTableContext = (): TableContextValue => {
	const context = useContext(TableContext);
	if (!context) {
		throw new Error("Table parts must be rendered inside <Table.Root>.");
	}
	return context;
};
