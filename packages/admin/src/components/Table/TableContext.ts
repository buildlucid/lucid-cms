import {
	type Accessor,
	createContext,
	type JSXElement,
	useContext,
} from "solid-js";

/** How a table blends with the surface behind it. */
export type TableVariant = "primary" | "secondary" | "contained";

/** Space a table leaves at its left and right edges. */
export type TablePadding = "sm" | "md";

export interface TableColumn {
	/** Matches the `column` a cell declares, and the sort key in query state. */
	key: string;
	label: string;
	/** Sits before the label in the header. */
	icon?: JSXElement;
	/** Turns the header into a sort button. Needs `queryState` on the root. */
	sortable?: boolean;
	width?: number;
	minWidth?: number;
}

/** Drag state the root owns and rows read while a reorder is in progress. */
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
	/** False when the viewer has hidden the column through the column toggle. */
	isColumnVisible: (_key: string | undefined) => boolean;
	isRowSelected: (_index: number) => boolean;
	toggleRowSelected: (_index: number) => void;
	rowReorder: TableRowReorder;
}

export const TableContext = createContext<TableContextValue>();

/** Reads the state shared by Table.Root with its rows and cells. */
export const useTableContext = (): TableContextValue => {
	const context = useContext(TableContext);
	if (!context) {
		throw new Error("Table parts must be rendered inside <Table.Root>.");
	}
	return context;
};
