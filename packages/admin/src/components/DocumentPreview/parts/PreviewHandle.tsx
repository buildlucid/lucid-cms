import classNames from "classnames";
import {
	TbOutlineArrowDown,
	TbOutlineArrowLeft,
	TbOutlineArrowRight,
	TbOutlineArrowUp,
	TbOutlineDots,
	TbOutlineGripVertical,
	TbOutlinePencil,
	TbOutlinePlus,
	TbOutlineRobot,
	TbOutlineTrash,
} from "solid-icons/tb";
import { type Component, createMemo, Show } from "solid-js";
import Button from "@/components/Button/Button";
import { getButtonClasses } from "@/components/Button/classes";
import Menu from "@/components/Menu/Menu";
import type {
	PreviewTarget,
	PreviewHoverBlock,
	PreviewPlace,
} from "@/preview/protocol";
import T from "@/translations";
import { HANDLE_SIZE } from "../utils/preview-handles";

//* how far the pointer moves before a press on the grip becomes a drag
const DRAG_THRESHOLD = 4;

const iconButtonClasses = getButtonClasses({
	variant: "ghost",
	size: "xs",
	shape: "square",
});

/** Brick or item handle with drag and menu actions. + inserts after, or before with Alt. */
export const PreviewHandle: Component<{
	kind: "brick" | "item";
	/** Hides it without unmounting, eg. while the page scrolls or it's dragged. */
	hidden: boolean;
	block: PreviewHoverBlock;
	name: string;
	position: { x: number; y: number };
	/** Whether something can be added next to it, which for bricks needs one the user can add. */
	canAdd: boolean;
	menuOpen: boolean;
	onMenuOpenChange: (open: boolean) => void;
	onAdd: (place: PreviewPlace) => void;
	onOpen: () => void;
	/** Asks the agent about it. Left out when there's no chat to ask in. */
	onAsk?: () => void;
	onMove: (place: PreviewPlace, anchor: PreviewTarget) => void;
	onRemove: () => void;
	onDragStart: () => void;
	onDrag: (point: { x: number; y: number }) => void;
	onDragEnd: (drop: boolean) => void;
	ref?: (element: HTMLDivElement) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	let grip: HTMLDivElement | undefined;
	let press: { x: number; y: number; dragging: boolean } | undefined;

	// ----------------------------------------
	// Memos
	const horizontal = createMemo(
		() => props.kind === "item" && props.block.horizontal,
	);
	const labels = createMemo(() => {
		if (props.kind === "brick") {
			return {
				earlier: T()("preview.edit.move.up"),
				later: T()("preview.edit.move.down"),
				before: T()("preview.edit.add.brick.above"),
				after: T()("preview.edit.add.brick.below"),
			};
		}
		return horizontal()
			? {
					earlier: T()("preview.edit.move.left"),
					later: T()("preview.edit.move.right"),
					before: T()("preview.edit.add.item.before"),
					after: T()("preview.edit.add.item.after"),
				}
			: {
					earlier: T()("preview.edit.move.up"),
					later: T()("preview.edit.move.down"),
					before: T()("preview.edit.add.item.above"),
					after: T()("preview.edit.add.item.below"),
				};
	});

	// ----------------------------------------
	// Functions
	const endPress = (drop: boolean) => {
		const ended = press;
		press = undefined;
		if (ended?.dragging) props.onDragEnd(drop);
	};
	const onPointerDown = (event: PointerEvent) => {
		if (event.button !== 0) return;
		//* a press that starts a drag shouldn't select text on the way
		event.preventDefault();
		grip?.setPointerCapture?.(event.pointerId);
		press = { x: event.clientX, y: event.clientY, dragging: false };
	};
	const onPointerMove = (event: PointerEvent) => {
		if (!press) return;
		if (!press.dragging) {
			if (
				Math.hypot(event.clientX - press.x, event.clientY - press.y) <=
				DRAG_THRESHOLD
			) {
				return;
			}
			press.dragging = true;
			props.onMenuOpenChange(false);
			props.onDragStart();
		}
		props.onDrag({ x: event.clientX, y: event.clientY });
	};
	const move = (place: PreviewPlace, anchor: PreviewTarget | null) => {
		if (anchor) props.onMove(place, anchor);
	};

	// ----------------------------------------
	// Render
	return (
		<div
			ref={props.ref}
			class="pointer-events-auto absolute top-0 left-0 flex items-center gap-px rounded-md border border-border bg-background p-px shadow-md transition-opacity duration-100 animate-dropdown"
			classList={{ "opacity-0": props.hidden }}
			style={{
				translate: `${Math.round(props.position.x)}px ${Math.round(props.position.y)}px`,
				width: `${HANDLE_SIZE.width}px`,
				height: `${HANDLE_SIZE.height}px`,
			}}
		>
			{/* pointer only: the menu moves it from the keyboard */}
			<div
				ref={grip}
				class={classNames(
					iconButtonClasses,
					"size-7 cursor-grab touch-none active:cursor-grabbing",
				)}
				title={T()("preview.edit.grip", { name: props.name })}
				aria-hidden="true"
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={() => endPress(true)}
				onPointerCancel={() => endPress(false)}
				onLostPointerCapture={() => endPress(false)}
			>
				<TbOutlineGripVertical size={14} />
			</div>
			<Button
				type="button"
				variant="ghost"
				size="xs"
				shape="square"
				title={labels().after}
				aria-label={labels().after}
				disabled={!props.canAdd}
				onClick={(event) => props.onAdd(event.altKey ? "before" : "after")}
			>
				<TbOutlinePlus size={14} />
			</Button>
			<Menu.Root
				open={props.menuOpen}
				onOpenChange={props.onMenuOpenChange}
				placement="bottom-start"
				gutter={6}
			>
				<Menu.Trigger
					class={iconButtonClasses}
					title={T()("preview.edit.options", { name: props.name })}
					aria-label={T()("preview.edit.options", { name: props.name })}
				>
					<TbOutlineDots size={14} />
				</Menu.Trigger>
				<Menu.Content dividers={false}>
					<Menu.Item
						icon={<TbOutlinePencil size={14} />}
						onSelect={props.onOpen}
					>
						{T()("preview.edit.open")}
					</Menu.Item>
					<Show when={props.onAsk}>
						{(ask) => (
							<Menu.Item
								icon={<TbOutlineRobot size={14} />}
								onSelect={() => ask()()}
							>
								{T()("preview.edit.ask")}
							</Menu.Item>
						)}
					</Show>
					<Menu.Separator />
					<Menu.Item
						icon={
							horizontal() ? (
								<TbOutlineArrowLeft size={14} />
							) : (
								<TbOutlineArrowUp size={14} />
							)
						}
						disabled={!props.block.previous}
						onSelect={() => move("before", props.block.previous)}
					>
						{labels().earlier}
					</Menu.Item>
					<Menu.Item
						icon={
							horizontal() ? (
								<TbOutlineArrowRight size={14} />
							) : (
								<TbOutlineArrowDown size={14} />
							)
						}
						disabled={!props.block.next}
						onSelect={() => move("after", props.block.next)}
					>
						{labels().later}
					</Menu.Item>
					<Menu.Separator />
					<Menu.Item
						icon={<TbOutlinePlus size={14} />}
						disabled={!props.canAdd}
						onSelect={() => props.onAdd("before")}
					>
						{labels().before}
					</Menu.Item>
					<Menu.Item
						icon={<TbOutlinePlus size={14} />}
						disabled={!props.canAdd}
						onSelect={() => props.onAdd("after")}
					>
						{labels().after}
					</Menu.Item>
					<Menu.Separator />
					<Menu.Item
						variant="danger"
						icon={<TbOutlineTrash size={14} />}
						onSelect={props.onRemove}
					>
						{T()("preview.edit.remove")}
					</Menu.Item>
				</Menu.Content>
			</Menu.Root>
		</div>
	);
};
