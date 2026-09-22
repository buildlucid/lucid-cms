import { useNavigate } from "@solidjs/router";
import classNames from "classnames";
import { type Component, createMemo, type JSXElement, Show } from "solid-js";
import type { ActionMenuProps } from "@/components/ActionMenu/ActionMenu";
import TableActionMenuCell from "@/components/Table/parts/TableActionMenuCell";
import TableDragHandleCell from "@/components/Table/parts/TableDragHandleCell";
import TableSelectionCell from "@/components/Table/parts/TableSelectionCell";
import { useTableContext } from "@/components/Table/TableContext";
import { checkPermission } from "@/utils/permission-requirement";

export interface TableRowProps {
	/** The row's position, starting from 0. */
	index: number;
	/** Shown in the row's action menu. Clicking the row runs the first available one. */
	actions?: ActionMenuProps["actions"];
	/** Runs instead of the first action when the row is clicked. */
	onClick?: () => void;
	/** Highlights the row. */
	current?: boolean;
	viewTransitionName?: string;
	class?: string;
	children: JSXElement;
}

/** A table row. */
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
				.filter((a) => a.excludeFromRowClick !== true)
				.find((action) => {
					return (
						checkPermission(action.permission).permitted &&
						action.disabled !== true
					);
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
					"outline outline-primary-low-border -outline-offset-1 [&>td]:bg-primary-low [&>td]:after:border-primary-low-border":
						props.current,
					"bg-background hover:bg-background-hover":
						(table.variant() === "primary" || table.variant() === undefined) &&
						!props.current,
					"bg-card hover:bg-background-hover":
						(table.variant() === "secondary" ||
							table.variant() === "contained") &&
						!props.current,
					"opacity-60": isDragging(),
					"outline outline-primary -outline-offset-1 [&>td]:bg-primary-low [&>td]:after:border-primary [&>td]:after:border-b-2":
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
