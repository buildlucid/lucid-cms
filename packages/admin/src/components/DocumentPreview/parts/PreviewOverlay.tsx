import classNames from "classnames";
import { TbOutlineGripVertical, TbOutlinePlus } from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
	Show,
} from "solid-js";
import type {
	PreviewRepeaterCapacity,
	PreviewStructureChange,
} from "@/hooks/usePreviewStructure/usePreviewStructure";
import {
	hasPreviewError,
	type PreviewFieldPath,
	type PreviewFieldTarget,
	type PreviewHover,
	type PreviewHoverBlock,
	type PreviewPlace,
} from "@/preview/protocol";
import T from "@/translations";
import {
	getPreviewTargetName,
	type PreviewEditingDetails,
} from "@/utils/preview-editing";
import spawnToast from "@/utils/spawn-toast";
import {
	distanceTo,
	HANDLE_GAP,
	OUTLINE_RADIUS,
	outlineRect,
	placeHandle,
	placeItemHandle,
} from "../utils/preview-handles";
import { PreviewBrickPicker } from "./PreviewBrickPicker";
import { PreviewHandle } from "./PreviewHandle";

//* how long controls stay after the pointer leaves what they belong to, to reach them across a gap
const LEAVE_GRACE_MS = 260;

type Kind = "brick" | "item";

/** The brick, item and repeater whose controls show: what the page last said the pointer was over, held while the pointer reaches them. */
type Held = {
	brick: PreviewHoverBlock | null;
	item: PreviewHoverBlock | null;
	repeater: PreviewHover["repeater"];
};

const nothingHeld: Held = { brick: null, item: null, repeater: null };
const heldKeys = ["brick", "item", "repeater"] as const satisfies ReadonlyArray<
	keyof Held
>;

/**
 * Draws brick and repeater controls using positions reported by the page. Includes drag handles,
 * insertion actions, menus and validation outlines. Sends changes through `onChange` for builder
 * validation.
 */
export const PreviewOverlay: Component<{
	hover: PreviewHover | null;
	/** The preview's zoom, which page positions are multiplied by. */
	scale: number;
	/** The visible preview's width, in the overlay's pixels. */
	width: number;
	/** Whether bricks and repeater items can be changed from the page. */
	structure: boolean;
	details: PreviewEditingDetails | null;
	/** The fields with validation errors. */
	errors: PreviewFieldPath[];
	/** How many items a repeater, or an item's repeater, has and can have. */
	capacity: (target: PreviewFieldTarget) => PreviewRepeaterCapacity | null;
	onOpen: (target: PreviewFieldTarget) => void;
	/** Applies a change, returning its undo step, or null when it made none. */
	onChange: (
		target: PreviewFieldTarget,
		change: PreviewStructureChange,
	) => number | null;
	/** Undoes a change's step, when nothing has changed since. */
	onUndo: (step: number) => void;
	/** Drags a brick or item to a point in the page's pixels. */
	onDrag: (target: PreviewFieldTarget, point: { x: number; y: number }) => void;
	onDragEnd: (drop: boolean) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	let root: HTMLDivElement | undefined;
	let brickHandle: HTMLDivElement | undefined;
	let itemHandle: HTMLDivElement | undefined;
	let addItem: HTMLButtonElement | undefined;
	const leaveTimers = new Map<keyof Held, number>();
	const [held, setHeld] = createSignal<Held>(nothingHeld);
	const [menu, setMenu] = createSignal<Kind | null>(null);
	const [picker, setPicker] = createSignal<{
		anchor: PreviewHoverBlock;
		place: PreviewPlace;
	} | null>(null);
	const [drag, setDrag] = createSignal<{
		block: PreviewHoverBlock;
		name: string;
		point: { x: number; y: number } | null;
	} | null>(null);

	// ----------------------------------------
	// Memos
	const busy = () => menu() !== null || picker() !== null || drag() !== null;
	//* controls stay mounted while hidden, so a drag keeps its grip
	const hidden = createMemo(
		() => props.hover?.scrolling === true || drag() !== null,
	);
	const view = createMemo(() => ({
		width: props.width,
		inset: (props.hover?.inset ?? 0) * props.scale,
	}));
	const addableBricks = createMemo(
		() => props.details?.bricks.filter((brick) => brick.addable) ?? [],
	);
	const pickerLabel = createMemo(() => {
		const current = picker();
		if (!current) return "";
		return T()(
			current.place === "before"
				? "preview.edit.bricks.add.above"
				: "preview.edit.bricks.add.below",
			{ name: nameOf(current.anchor.target) },
		);
	});
	const brickOutline = createMemo(() => {
		const brick = held().brick;
		return brick ? outlineRect(brick.rect, props.scale, props.width) : null;
	});
	const brickPosition = createMemo(() => {
		const outline = brickOutline();
		return outline ? placeHandle(outline, view()) : null;
	});
	const itemPosition = createMemo(() => {
		const item = held().item;
		return item
			? placeItemHandle(
					outlineRect(item.rect, props.scale, props.width),
					view(),
					brickPosition(),
				)
			: null;
	});
	const repeaterCapacity = createMemo(() => {
		const repeater = held().repeater;
		return repeater ? props.capacity(repeater.target) : null;
	});
	//* shown on the repeater's add button when it has one
	const repeaterLimit = createMemo(() => {
		const capacity = repeaterCapacity();
		return capacity && capacity.max !== null
			? { count: capacity.count, max: capacity.max }
			: null;
	});
	const repeaterTitle = createMemo(() => {
		const repeater = held().repeater;
		if (!repeater) return "";
		const name = nameOf(repeater.target);
		const limit = repeaterLimit();
		return limit && limit.count >= limit.max
			? T()("preview.edit.add.item.full", { name, max: limit.max })
			: T()("preview.edit.add.item.to", { name });
	});

	// ----------------------------------------
	// Functions
	const nameOf = (target: PreviewFieldTarget) =>
		props.details ? getPreviewTargetName(props.details, target) : "";
	/** Whether the pointer is on a control, asked of the page as controls can leave from under it without a pointerout. */
	const isOverControls = () => root?.querySelector(":hover") !== null;

	const cancelLeave = (key: keyof Held) => {
		window.clearTimeout(leaveTimers.get(key));
		leaveTimers.delete(key);
	};
	const scheduleLeave = (key: keyof Held) => {
		if (leaveTimers.has(key)) return;
		leaveTimers.set(
			key,
			window.setTimeout(() => {
				leaveTimers.delete(key);
				if (busy() || isOverControls()) return;
				setHeld((previous) => ({ ...previous, [key]: null }));
			}, LEAVE_GRACE_MS),
		);
	};
	const leaveAll = () => {
		for (const key of heldKeys) {
			if (held()[key]) scheduleLeave(key);
		}
	};
	/** Whether a point on the page is on or beside a control, eg. crossing the gap to a handle. */
	const isNearControls = (point: { x: number; y: number }) => {
		if (!root) return false;
		const origin = root.getBoundingClientRect();
		const scaled = { x: point.x * props.scale, y: point.y * props.scale };
		return [brickHandle, itemHandle, addItem].some((element) => {
			if (!element?.isConnected) return false;
			const rect = element.getBoundingClientRect();
			return (
				distanceTo(
					{
						x: rect.x - origin.x,
						y: rect.y - origin.y,
						width: rect.width,
						height: rect.height,
					},
					scaled,
				) <=
				HANDLE_GAP + 4
			);
		});
	};
	/** Takes in what the page says is under the pointer, holding controls the pointer is reaching for. */
	const absorb = (hover: PreviewHover) => {
		const pointerGone = hover.pointer === null;
		const holding =
			busy() ||
			isOverControls() ||
			(hover.pointer !== null && isNearControls(hover.pointer));
		const next: Held = { ...held() };
		const take = <TKey extends keyof Held>(key: TKey, incoming: Held[TKey]) => {
			const current = next[key];
			//* the same element, whose target may have changed if a re-render moved it
			if (incoming && current && incoming.key === current.key) {
				next[key] = incoming;
				if (pointerGone && !holding) scheduleLeave(key);
				else cancelLeave(key);
				return;
			}
			if (holding) return;
			if (incoming) {
				next[key] = incoming;
				cancelLeave(key);
				return;
			}
			if (current) scheduleLeave(key);
		};
		take("brick", hover.brick);
		take("item", hover.item);
		take("repeater", hover.repeater);
		setHeld(next);
	};

	const add = (kind: Kind, block: PreviewHoverBlock, place: PreviewPlace) => {
		if (kind === "brick") {
			setPicker({ anchor: block, place });
			return;
		}
		props.onChange(block.target, { action: "add", place });
	};
	const remove = (kind: Kind, block: PreviewHoverBlock) => {
		const name = nameOf(block.target);
		const step = props.onChange(block.target, { action: "remove" });
		if (step === null) return;
		setHeld((previous) => ({ ...previous, [kind]: null }));
		spawnToast({
			title: T()("preview.edit.removed", { name }),
			status: "success",
			action: {
				label: T()("preview.edit.undo"),
				onClick: () => props.onUndo(step),
			},
		});
	};
	const dragTo = (point: { x: number; y: number }) => {
		const current = drag();
		if (!current || !root) return;
		const origin = root.getBoundingClientRect();
		const local = { x: point.x - origin.x, y: point.y - origin.y };
		setDrag({ ...current, point: local });
		props.onDrag(current.block.target, {
			x: local.x / props.scale,
			y: local.y / props.scale,
		});
	};
	const endDrag = (drop: boolean) => {
		if (!drag()) return;
		setDrag(null);
		props.onDragEnd(drop);
	};
	/** Cancels a drag and closes the menu and picker, eg. once changes aren't allowed. */
	const stopInteracting = () => {
		endDrag(false);
		setMenu(null);
		setPicker(null);
	};

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => props.hover,
			(hover) => {
				if (hover) {
					absorb(hover);
					return;
				}
				for (const key of heldKeys) cancelLeave(key);
				stopInteracting();
				setHeld(nothingHeld);
			},
		),
	);
	createEffect(
		on(
			() => props.structure,
			(structure) => {
				if (!structure) stopInteracting();
			},
		),
	);
	//* once a menu, picker or drag is done, controls go unless the pointer is on them or the page reports otherwise
	createEffect(
		on(busy, (now, before) => {
			if (before && !now) leaveAll();
		}),
	);
	createEffect(() => {
		if (!drag()) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") endDrag(false);
		};
		window.addEventListener("keydown", onKeyDown);
		onCleanup(() => window.removeEventListener("keydown", onKeyDown));
	});
	onCleanup(() => {
		for (const key of heldKeys) cancelLeave(key);
		endDrag(false);
	});

	// ----------------------------------------
	// Render
	const handle = (kind: Kind, block: () => PreviewHoverBlock) => (
		<PreviewHandle
			ref={(element) => {
				if (kind === "brick") brickHandle = element;
				else itemHandle = element;
			}}
			kind={kind}
			hidden={hidden()}
			block={block()}
			name={nameOf(block().target)}
			position={
				(kind === "brick" ? brickPosition() : itemPosition()) ?? { x: 0, y: 0 }
			}
			canAdd={
				kind === "item"
					? props.capacity(block().target)?.canAdd === true
					: addableBricks().length > 0
			}
			menuOpen={menu() === kind}
			onMenuOpenChange={(open) => setMenu(open ? kind : null)}
			onAdd={(place) => add(kind, block(), place)}
			onOpen={() => props.onOpen(block().target)}
			onMove={(place, anchor) =>
				props.onChange(block().target, { action: "move", place, anchor })
			}
			onRemove={() => remove(kind, block())}
			onDragStart={() =>
				setDrag({ block: block(), name: nameOf(block().target), point: null })
			}
			onDrag={dragTo}
			onDragEnd={endDrag}
		/>
	);

	return (
		<div
			ref={root}
			class="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none"
			onPointerOver={() => {
				for (const key of heldKeys) cancelLeave(key);
			}}
			onPointerOut={(event) => {
				if (
					event.relatedTarget instanceof Node &&
					root?.contains(event.relatedTarget)
				) {
					return;
				}
				leaveAll();
			}}
		>
			<Show when={props.structure && held().brick}>
				{(brick) => (
					<>
						<Show when={brickOutline()}>
							{(outline) => (
								<div
									class={classNames(
										"absolute top-0 left-0",
										hasPreviewError(props.errors, brick().target)
											? "shadow-[inset_0_0_0_1px_rgba(232,72,72,0.7)]"
											: "shadow-[inset_0_0_0_1px_rgba(120,120,128,0.45)]",
									)}
									classList={{ hidden: hidden() }}
									style={{
										translate: `${Math.round(outline().x)}px ${Math.round(outline().y)}px`,
										width: `${Math.round(outline().width)}px`,
										height: `${Math.round(outline().height)}px`,
										"border-radius": `${OUTLINE_RADIUS * props.scale}px`,
									}}
								/>
							)}
						</Show>
						{handle("brick", brick)}
					</>
				)}
			</Show>
			<Show when={props.structure && held().item}>
				{(item) => handle("item", item)}
			</Show>
			<Show when={props.structure && !hidden() && !busy() && held().repeater}>
				{(repeater) => (
					<button
						ref={addItem}
						type="button"
						class="pointer-events-auto absolute top-0 left-0 flex h-7 items-center gap-1.5 rounded-md border border-border bg-popover px-2.5 text-xs font-medium text-title shadow-md transition-colors duration-200 hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-popover animate-dropdown"
						style={{
							translate: `calc(${Math.round((repeater().rect.x + repeater().rect.width / 2) * props.scale)}px - 50%) calc(${Math.round((repeater().rect.y + repeater().rect.height) * props.scale)}px - 50%)`,
						}}
						title={repeaterTitle()}
						disabled={repeaterCapacity()?.canAdd !== true}
						onClick={() =>
							props.onChange(repeater().target, {
								action: "add",
								place: "after",
							})
						}
					>
						<TbOutlinePlus size={12} />
						{T()("preview.edit.add.item")}
						<Show when={repeaterLimit()}>
							{(limit) => (
								<span class="font-normal text-muted tabular-nums">
									{limit().count}/{limit().max}
								</span>
							)}
						</Show>
					</button>
				)}
			</Show>
			<Show when={drag()}>
				{(current) => (
					<>
						<div class="pointer-events-auto absolute inset-0 cursor-grabbing" />
						<Show when={current().point}>
							{(point) => (
								<div
									class="absolute top-0 left-0 flex h-8 max-w-60 -rotate-1 items-center gap-2 rounded-md border border-border bg-popover px-3 text-sm text-title shadow-md"
									style={{
										translate: `${Math.round(point().x + 14)}px ${Math.round(point().y + 10)}px`,
									}}
								>
									<TbOutlineGripVertical
										size={14}
										class="shrink-0 text-muted"
									/>
									<span class="truncate">{current().name}</span>
								</div>
							)}
						</Show>
					</>
				)}
			</Show>
			<PreviewBrickPicker
				open={picker() !== null}
				onOpenChange={(open) => {
					if (!open) setPicker(null);
				}}
				label={pickerLabel()}
				anchorRect={() => brickHandle?.getBoundingClientRect()}
				returnFocus={() => brickHandle?.querySelector("button")}
				bricks={addableBricks()}
				onPick={(brickKey) => {
					const current = picker();
					setPicker(null);
					if (!current) return;
					props.onChange(current.anchor.target, {
						action: "add",
						place: current.place,
						brickKey,
					});
				}}
			/>
		</div>
	);
};
