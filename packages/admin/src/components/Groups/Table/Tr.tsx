import { useNavigate } from "@solidjs/router";
import classNames from "classnames";
import { type Component, createMemo, type JSXElement, Show } from "solid-js";
import type { ActionDropdownProps } from "@/components/Partials/ActionDropdown";
import ActionMenuCol from "@/components/Tables/Columns/ActionMenuCol";
import DragHandleCol from "@/components/Tables/Columns/DragHandleCol";
import SelectCol from "@/components/Tables/Columns/SelectCol";
import type { TableRowProps } from "@/types/components";
import type { TableRowReorder, TableTheme } from "./Table";

interface TrProps extends TableRowProps {
	actions?: ActionDropdownProps["actions"];
	onClick?: () => void;
	current?: boolean;
	viewTransitionName?: string;
	children: JSXElement;
	theme?: TableTheme;
	reorder?: {
		rowReorder: TableRowReorder;
	};
}

// Table Row

export const Tr: Component<TrProps> = (props) => {
	// ----------------------------------------
	// State / Hooks
	const navigate = useNavigate();

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
	const onClickHandler = () => {
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
	const rowReorder = createMemo(() => props.reorder?.rowReorder);
	const isDragging = createMemo(
		() =>
			rowReorder()?.draggingIndex !== null &&
			rowReorder()?.draggingIndex === props.index,
	);
	const isDropTarget = createMemo(() => {
		const reorder = rowReorder();
		if (!reorder || reorder.draggingIndex === null) return false;
		return (
			reorder.dropTargetIndex === props.index &&
			reorder.dropTargetIndex !== reorder.draggingIndex
		);
	});

	// ----------------------------------------
	// Render
	return (
		<tr
			class={classNames("duration-200 transition-colors", {
				"cursor-pointer": firstPermittedAction() !== undefined || props.onClick,
				"outline outline-primary-muted-border -outline-offset-1 [&>td]:bg-primary-muted-bg [&>td]:after:border-primary-muted-border":
					props.current,
				"bg-background-base hover:bg-background-hover":
					(props.theme === "primary" || props.theme === undefined) &&
					!props.current,
				"bg-card-base hover:bg-card-hover":
					(props.theme === "secondary" || props.theme === "contained") &&
					!props.current,
				"opacity-60": isDragging(),
				"outline outline-primary-base -outline-offset-1 [&>td]:bg-primary-muted-bg [&>td]:after:border-primary-base [&>td]:after:border-b-2":
					isDropTarget(),
			})}
			style={{
				"view-transition-name": props.viewTransitionName,
			}}
			onClick={onClickHandler}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					onClickHandler();
				}
			}}
			onDragEnter={(e) => {
				const reorder = rowReorder();
				if (!reorder?.enabled || props.index === undefined) return;
				reorder.onDragEnter(props.index, e);
			}}
			onDragOver={(e) => {
				const reorder = rowReorder();
				if (!reorder?.enabled) return;
				reorder.onDragOver(e);
			}}
		>
			<Show when={rowReorder()?.enabled}>
				<DragHandleCol
					onDragStart={(e) => {
						const reorder = rowReorder();
						if (!reorder || props.index === undefined) return;
						reorder.onDragStart(props.index, e);
					}}
					onDragEnd={(e) => {
						rowReorder()?.onDragEnd(e);
					}}
					padding={props.options?.padding}
				/>
			</Show>
			<Show when={props.options?.isSelectable}>
				<SelectCol
					type={"td"}
					value={props?.selected || false}
					onChange={() => {
						if (props.callbacks?.setSelected && props?.index !== undefined) {
							props.callbacks.setSelected(props?.index);
						}
					}}
				/>
			</Show>
			{props.children}
			<ActionMenuCol
				actions={props.actions || []}
				raised={props.options?.raisedActions}
			/>
		</tr>
	);
};
