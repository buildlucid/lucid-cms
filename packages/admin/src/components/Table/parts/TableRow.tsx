import { useNavigate } from "@solidjs/router";
import classNames from "classnames";
import { type Component, createMemo, type JSXElement, Show } from "solid-js";
import type { ActionMenuProps } from "@/components/ActionMenu/ActionMenu";
import TableActionMenuCell from "@/components/Table/parts/TableActionMenuCell";
import TableDragHandleCell from "@/components/Table/parts/TableDragHandleCell";
import TableSelectionCell from "@/components/Table/parts/TableSelectionCell";
import { useTableContext } from "@/components/Table/TableContext";

export interface TableRowProps {
	/** Position in the table, counting from zero. Drives selection and reordering. */
	index: number;
	/** Shown in the row's menu. The first permitted one also runs on row click. */
	actions?: ActionMenuProps["actions"];
	/** Replaces the default click behaviour of running the first action. */
	onClick?: () => void;
	/** Highlights the row as the one being viewed. */
	current?: boolean;
	viewTransitionName?: string;
	class?: string;
	children: JSXElement;
}

/** One body row. Put cells inside it. */
const TableRow: Component<TableRowProps> = (props) => {
	// ----------------------------------------
	// State / Hooks
	const navigate = useNavigate();
	const table = useTableContext();

	// ----------------------------------------
	// Memos
	const firstPermittedAction = createMemo(() => {
		if (props.actions) {
			return props.actions
				.filter((a) => a.actionExclude !== true)
				.find((action) => {
					return action.permission !== false && action.disabled !== true;
				});
		}
	});

	// ----------------------------------------
	// Functions
	const onClickHandler = (event: MouseEvent | KeyboardEvent) => {
		if (
			event.defaultPrevented ||
			(event.target instanceof Element &&
				event.target.closest(
					"a, button, input, select, textarea, [role=button], [contenteditable=true]",
				))
		) {
			return;
		}

		if (props.onClick) {
			props.onClick();
			return;
		}

		const action = firstPermittedAction();

		if (action) {
			if (action?.href) {
				navigate(action.href);
			} else if (action.onClick) {
				action.onClick();
			}
		}
	};

	// ----------------------------------------
	// Memos
	const isDragging = createMemo(
		() =>
			table.rowReorder.draggingIndex !== null &&
			table.rowReorder.draggingIndex === props.index,
	);
	const isDropTarget = createMemo(() => {
		if (table.rowReorder.draggingIndex === null) return false;
		return (
			table.rowReorder.dropTargetIndex === props.index &&
			table.rowReorder.dropTargetIndex !== table.rowReorder.draggingIndex
		);
	});

	// ----------------------------------------
	// Render
	return (
		<tr
			data-table-row
			class={classNames(
				"duration-200 transition-colors",
				{
					"cursor-pointer":
						firstPermittedAction() !== undefined || props.onClick,
					"outline outline-primary-muted-border -outline-offset-1 [&>td]:bg-primary-muted-bg [&>td]:after:border-primary-muted-border":
						props.current,
					"bg-background-base hover:bg-row-hover":
						(table.variant() === "primary" || table.variant() === undefined) &&
						!props.current,
					"bg-card-base hover:bg-row-hover":
						(table.variant() === "secondary" ||
							table.variant() === "contained") &&
						!props.current,
					"opacity-60": isDragging(),
					"outline outline-primary-base -outline-offset-1 [&>td]:bg-primary-muted-bg [&>td]:after:border-primary-base [&>td]:after:border-b-2":
						isDropTarget(),
				},
				props.class,
			)}
			style={{
				"view-transition-name": props.viewTransitionName,
			}}
			onClick={onClickHandler}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					onClickHandler(e);
				}
			}}
			onDragEnter={(e) => {
				if (!table.rowReorder.enabled) return;
				table.rowReorder.onDragEnter(props.index, e);
			}}
			onDragOver={(e) => {
				if (!table.rowReorder.enabled) return;
				table.rowReorder.onDragOver(e);
			}}
		>
			<Show when={table.rowReorder.enabled}>
				<TableDragHandleCell
					onDragStart={(e) => table.rowReorder.onDragStart(props.index, e)}
					onDragEnd={(e) => table.rowReorder.onDragEnd(e)}
				/>
			</Show>
			<Show when={table.isSelectable()}>
				<TableSelectionCell
					type="td"
					value={table.isRowSelected(props.index)}
					onChange={() => table.toggleRowSelected(props.index)}
				/>
			</Show>
			{props.children}
			<TableActionMenuCell actions={props.actions || []} />
		</tr>
	);
};

export default TableRow;
