import classNames from "classnames";
import {
	createEffect,
	createMemo,
	createSignal,
	Index,
	type JSXElement,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import TableColumnToggle from "@/components/Table/parts/TableColumnToggle";
import TableHeaderCell from "@/components/Table/parts/TableHeaderCell";
import TableLoadingRow from "@/components/Table/parts/TableLoadingRow";
import TableSelectAction, {
	type TableSelectActionItem,
} from "@/components/Table/parts/TableSelectAction";
import TableSelectionCell from "@/components/Table/parts/TableSelectionCell";
import {
	type TableColumn,
	TableContext,
	type TableContextValue,
	type TablePadding,
	type TableRowReorder,
	type TableVariant,
} from "@/components/Table/TableContext";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import type {
	TableRowId,
	TableSelection,
} from "@/hooks/useTableSelection/useTableSelection";
import useUserPreference from "@/hooks/useUserPreference/useUserPreference";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";

export interface TableRootProps<TRow extends { id: TableRowId }> {
	/** Unique ID used to remember hidden columns and scroll position. */
	id: string;
	rowCount: number;
	/** The rows, in render order. Required for selection. */
	data?: readonly TRow[];
	columns: TableColumn[];
	/** Required for sortable columns. */
	queryState?: QueryStateResponse;
	loading?: boolean;
	/** Number of placeholder rows shown while loading. @default 10 */
	loadingRows?: number;
	caption?: string;
	/** Turns on row checkboxes when an action can take the selected rows. Requires `data`. */
	selection?: TableSelection<TRow>;
	/** Set to false to turn selection off, eg. while reordering. */
	selectable?: boolean;
	selectActions?: TableSelectActionItem<TRow>[];
	/** @default "md" */
	padding?: TablePadding;
	/** @default "primary" */
	variant?: TableVariant;
	/** Shows a restore action for selected rows. Requires `onRestoreRows`. */
	allowRestore?: boolean;
	/** Shows a delete action for selected rows. Requires `onDeleteRows`. */
	allowDelete?: boolean;
	/** Shows a permanent delete action for selected rows. Requires `onDeletePermanentlyRows`. */
	allowDeletePermanently?: boolean;
	/** Receives the selected rows, including ones on other pages. */
	onDeleteRows?: (_rows: TRow[]) => Promise<void>;
	onRestoreRows?: (_rows: TRow[]) => Promise<void>;
	onDeletePermanentlyRows?: (_rows: TRow[]) => Promise<void>;
	/** Adds drag handles for reordering rows. Requires `onReorder`. */
	reorderable?: boolean;
	onReorder?: (
		_dragIndex: number,
		_targetIndex: number,
	) => void | Promise<void>;
	/** Applied to the scroll container. */
	class?: string;
	children: JSXElement;
}

const tableScrollPositions = new Map<string, number>();
//* only one table can own the shared selection bar
const [selectionOwner, setSelectionOwner] = createSignal<symbol>();

/** The table, which holds its columns, rows and shared state. */
const TableRoot = <TRow extends { id: TableRowId }>(
	props: TableRootProps<TRow>,
): JSXElement => {
	let overflowRef: HTMLDivElement | undefined;

	const selectionKey = Symbol(props.id);
	const [dragIndex, setDragIndex] = createSignal<number | null>(null);
	const [dropTargetIndex, setDropTargetIndex] = createSignal<number | null>(
		null,
	);
	const [hiddenColumns, setHiddenColumns] = useUserPreference({
		value: () => userPreferencesStore.getHiddenTableColumns(props.id),
		setValue: (value) =>
			userPreferencesStore.setHiddenTableColumns(props.id, value),
		defaultValue: () => [],
	});
	const include = createMemo(() => {
		const hidden = new Set(hiddenColumns());
		return props.columns.map((column) => !hidden.has(column.key));
	});

	// ----------------------------------------
	// Functions
	const toggleInclude = (index: number) => {
		const isOnlyOne = include().filter((i) => i).length === 1;
		if (isOnlyOne && include()[index]) {
			return;
		}

		const columnKey = props.columns[index]?.key;
		if (!columnKey) return;

		const nextHidden = new Set(hiddenColumns());
		if (nextHidden.has(columnKey)) nextHidden.delete(columnKey);
		else nextHidden.add(columnKey);
		setHiddenColumns(Array.from(nextHidden));
	};
	const setOverflowState = () => {
		if (overflowRef && overflowRef.scrollWidth > overflowRef.clientWidth) {
			overflowRef.setAttribute("data-overflowing", "true");
		} else {
			overflowRef?.setAttribute("data-overflowing", "false");
		}
	};
	const restoreScrollPosition = () => {
		const scrollLeft = tableScrollPositions.get(props.id);
		if (scrollLeft === undefined) return;

		requestAnimationFrame(() => {
			if (!overflowRef) return;

			overflowRef.scrollLeft = scrollLeft;
			setOverflowState();
		});
	};

	// ----------------------------------------
	// Callbacks
	//* the header checkbox only covers the current page
	const onSelectChange = () => {
		if (props.loading) return;
		props.selection?.set(props.data ?? [], !allSelected());
	};

	// ----------------------------------------
	// Row Reorder
	const rowReorderEnabled = createMemo(() => props.reorderable ?? false);
	const onRowDragStart = (index: number, e: DragEvent) => {
		if (!rowReorderEnabled()) return;
		e.stopPropagation();
		if (e.dataTransfer) {
			const dragImage = document.createElement("canvas");
			dragImage.width = 1;
			dragImage.height = 1;
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", `${index}`);
			e.dataTransfer.setDragImage(dragImage, 0, 0);
		}
		setDragIndex(index);
		setDropTargetIndex(index);
	};
	const onRowDragEnter = (index: number, e: DragEvent) => {
		if (dragIndex() === null) return;
		e.preventDefault();
		setDropTargetIndex(index);
	};
	const onRowDragOver = (e: DragEvent) => {
		if (dragIndex() === null) return;
		e.preventDefault();
	};
	const onRowDragEnd = (e: DragEvent) => {
		e.preventDefault();
		const from = dragIndex();
		const to = dropTargetIndex();

		if (from === null || to === null || from === to) {
			setDragIndex(null);
			setDropTargetIndex(null);
			return;
		}

		const updateRows = () => {
			setDragIndex(null);
			setDropTargetIndex(null);
			void props.onReorder?.(from, to);
		};

		if ("startViewTransition" in document) {
			document.startViewTransition(updateRows);
			return;
		}

		updateRows();
	};

	const rowReorder: TableRowReorder = {
		get enabled() {
			return rowReorderEnabled();
		},
		get draggingIndex() {
			return dragIndex();
		},
		get dropTargetIndex() {
			return dropTargetIndex();
		},
		onDragStart: onRowDragStart,
		onDragEnd: onRowDragEnd,
		onDragEnter: onRowDragEnter,
		onDragOver: onRowDragOver,
	};

	// ----------------------------------------
	// Memos
	const isSelectable = createMemo(
		() =>
			props.selectable !== false &&
			props.selection !== undefined &&
			((props.allowRestore === true && props.onRestoreRows !== undefined) ||
				(props.allowDelete === true && props.onDeleteRows !== undefined) ||
				(props.allowDeletePermanently === true &&
					props.onDeletePermanentlyRows !== undefined) ||
				(props.selectActions?.length ?? 0) > 0),
	);
	const padding = createMemo<TablePadding>(() => props.padding ?? "md");
	const allSelected = createMemo(() => {
		const selection = props.selection;
		if (!selection || !props.data?.length) return false;
		return props.data.every((row) => selection.isSelected(row));
	});
	const selectedCount = createMemo(() => props.selection?.count() ?? 0);
	const includeRows = createMemo(() => {
		return props.columns.map((h, i) => {
			return {
				index: i,
				label: h.label,
				include: include()[i],
			};
		});
	});
	const hiddenColumnKeys = createMemo(() => new Set(hiddenColumns()));

	const context: TableContextValue = {
		padding,
		variant: () => props.variant,
		isSelectable,
		isColumnVisible: (key) => {
			if (key === undefined) return true;
			return !hiddenColumnKeys().has(key);
		},
		isRowSelected: (index) => {
			const row = props.data?.[index];
			return row !== undefined && (props.selection?.isSelected(row) ?? false);
		},
		toggleRowSelected: (index) => {
			const row = props.data?.[index];
			if (row) props.selection?.toggle(row);
		},
		rowReorder,
	};

	// ----------------------------------------
	// Effects
	onMount(() => {
		window.addEventListener("resize", setOverflowState);
		onCleanup(() => window.removeEventListener("resize", setOverflowState));
	});
	//* new rows may change whether the table overflows
	createEffect(() => {
		props.data;
		props.rowCount;
		setOverflowState();
	});
	createEffect(() => {
		props.id;
		props.rowCount;
		props.loading;

		restoreScrollPosition();
	});
	createEffect(() => {
		if (isSelectable()) return;
		props.selection?.clear();
	});
	createEffect(() => {
		if (selectedCount() > 0) setSelectionOwner(selectionKey);
	});
	createEffect(() => {
		if (selectionOwner() === selectionKey) return;
		props.selection?.clear();
	});
	onCleanup(() => {
		if (selectionOwner() === selectionKey) setSelectionOwner(undefined);
	});

	// ----------------------------------------
	// Render
	return (
		<TableContext.Provider value={context}>
			{/* Table */}
			<div
				data-table
				class={classNames(
					"w-full overflow-x-auto scrollbar",
					{
						"border-y border-border bg-card": props.variant === "contained",
					},
					props.class,
				)}
				ref={overflowRef}
				onScroll={() => {
					if (!overflowRef) return;
					tableScrollPositions.set(props.id, overflowRef.scrollLeft);
				}}
			>
				<table class="w-full table h-auto border-collapse">
					<Show when={props.caption}>
						<div class="caption-bottom border-t-primary border-t-2 border-b border-b-border bg-input text-title py-2 text-sm">
							{props.caption}
						</div>
					</Show>
					<thead>
						<tr class="h-10">
							<Show when={rowReorderEnabled()}>
								<TableHeaderCell class="w-10" />
							</Show>
							<Show when={isSelectable()}>
								<TableSelectionCell
									type="th"
									value={allSelected()}
									onChange={onSelectChange}
								/>
							</Show>
							<Index each={props.columns}>
								{(head) => (
									<TableHeaderCell
										column={head().key}
										label={head().label}
										icon={head().icon}
										queryState={props.queryState}
										width={head().width}
										minWidth={head().minWidth}
										sortable={head().sortable}
									/>
								)}
							</Index>
							<TableHeaderCell class="text-right right-0">
								<TableColumnToggle
									columns={includeRows() || []}
									onToggle={toggleInclude}
								/>
							</TableHeaderCell>
						</tr>
					</thead>
					<tbody>
						<Show
							when={!props.loading}
							fallback={
								<Index
									each={Array.from({
										length: props.loadingRows ?? 10,
									})}
								>
									{() => (
										<TableLoadingRow
											columns={props.columns.map((head) => head.key)}
											hasReorderColumn={rowReorderEnabled()}
										/>
									)}
								</Index>
							}
						>
							{props.children}
						</Show>
					</tbody>
				</table>
			</div>
			{/* Select Action */}
			<TableSelectAction
				rows={() => props.selection?.rows() ?? []}
				selectedCount={selectedCount}
				clear={() => props.selection?.clear()}
				allowRestore={props.allowRestore ?? false}
				allowDelete={props.allowDelete ?? false}
				allowDeletePermanently={props.allowDeletePermanently ?? false}
				actions={props.selectActions ?? []}
				callbacks={{
					delete: props.onDeleteRows,
					restore: props.onRestoreRows,
					deletePermanently: props.onDeletePermanentlyRows,
				}}
			/>
		</TableContext.Provider>
	);
};

export default TableRoot;
