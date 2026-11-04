import {
	getPreviewTargetKind,
	hasPreviewError,
	isSamePreviewTarget,
	type PreviewEditing,
	type PreviewFieldTarget,
	type PreviewHover,
	type PreviewHoverBlock,
	type PreviewLanding,
	type PreviewPlace,
	type PreviewRect,
	previewFieldAttribute,
} from "../protocol/index.js";
import { createInlineEditing, readPlainText } from "./inline.js";
import {
	create,
	createLayer,
	isInView,
	outlineOf,
	rectOf,
	scrollToElement,
	setBox,
	topInset,
} from "./layer.js";
import { reorderOffsets } from "./reorder.js";
import { previewOverlayStyles } from "./styles.js";
import {
	findRendered,
	isEditedTarget,
	type MarkedElement,
	markedAlong,
	readTarget,
	resolveMarked,
	siblingsOf,
} from "./targets.js";

const SCROLL_EDGE = 64;
//* how long a highlight waits for its element, eg. a brick added in the builder
const PENDING_HIGHLIGHT_MS = 4000;
const FLASH_MS = 1600;
//* how long after its last scroll event the page still counts as scrolling
const SCROLL_SETTLE_MS = 150;
const SHIFT_MS = 200;
//* how long a dropped brick or item stays where it was shown landing, waiting for the page to re-render with the move
const LANDED_MS = 4000;
//* how faint a dragged brick or item is where it would land
const DRAGGED_OPACITY = 0.4;
//* how long after a drop zooming back in keeps where it was dropped in place
const DROP_ANCHOR_MS = 1500;

type PreviewEditingOptions = {
	targetWindow: Window;
	isConnected: () => boolean;
	/** Asks the builder to open a field, item or brick, returning whether it was sent. */
	sendFocus: (target: PreviewFieldTarget) => boolean;
	/** Tells the builder the user cleared the selection. */
	sendDeselect: () => void;
	/** Tells the builder what the pointer is over, for it to draw controls against. */
	sendHover: (hover: PreviewHover) => void;
	sendMove: (
		target: PreviewFieldTarget,
		place: PreviewPlace,
		anchor: PreviewFieldTarget,
	) => void;
	/** Asks the builder to edit a selected field, with the text its element shows when that's all it holds. */
	sendEdit: (target: PreviewFieldTarget, text: string | null) => void;
	/** Sends the text typed into a field on the page so far. */
	sendInlineInput: (target: PreviewFieldTarget, value: string) => void;
	/** Says typing into a field finished, keeping the text or, when `cancelled`, going back. */
	sendInlineEnd: (target: PreviewFieldTarget, cancelled: boolean) => void;
};

type Slot = { anchor: MarkedElement; place: PreviewPlace };

type Offset = { x: number; y: number };

type Drag = {
	/** Dragged on the page by the builder's handle, following the pointer, or in the builder's fields, which say where it would land. */
	source: "page" | "builder";
	owner: MarkedElement;
	/** The owner and its siblings in page order, where they were in the document when the drag started. */
	list: Array<{ marked: MarkedElement; rect: PreviewRect }>;
	horizontal: boolean;
	x: number;
	y: number;
	slot: Slot | null;
};

const kindOf = (marked: MarkedElement) => getPreviewTargetKind(marked.target);

const sameElement = (a: MarkedElement | null, b: MarkedElement | null) =>
	a !== null && b !== null && a.element === b.element;

/** Rects for elements that take up space, so collapsed content isn't drawn over. */
const visibleRect = (marked: MarkedElement | null): PreviewRect | null => {
	if (!marked) return null;
	const rect = rectOf(marked.element);
	return rect.width > 0 || rect.height > 0 ? rect : null;
};

const roundRect = (rect: PreviewRect): PreviewRect => ({
	x: Math.round(rect.x),
	y: Math.round(rect.y),
	width: Math.round(rect.width),
	height: Math.round(rect.height),
});

/** Whether siblings sit side by side, eg. cards in a row, rather than one above another. */
const isHorizontal = (rects: PreviewRect[]) => {
	const [a, b] = rects;
	if (!a || !b) return false;
	return Math.abs(a.y - b.y) < Math.min(a.height, b.height) / 2;
};

const distanceTo = (rect: PreviewRect, x: number, y: number) =>
	Math.hypot(
		Math.max(rect.x - x, 0, x - rect.x - rect.width),
		Math.max(rect.y - y, 0, y - rect.y - rect.height),
	);

/** Whether a target is one of the repeaters edit mode lists, whose paths have "*" for item indexes. */
const isRepeater = (editing: PreviewEditing, target: PreviewFieldTarget) =>
	editing.repeaters.some(
		(repeater) =>
			repeater.brick === target.brick?.key &&
			repeater.path.length === target.path.length &&
			repeater.path.every((segment, index) => {
				const part = target.path[index];
				return segment === "*" ? typeof part === "number" : segment === part;
			}),
	);

/**
 * Reports targets and pointer positions, previews drag reordering and outlines validation errors.
 * Clicking opens a field; clicking again or Enter requests inline or builder editing. Outside edit
 * mode, Alt reveals targets and Alt-click opens them.
 */
export const installPreviewEditing = (options: PreviewEditingOptions) => {
	const { targetWindow } = options;
	const { document } = targetWindow;
	let editing: PreviewEditing | null = null;
	let field: MarkedElement | null = null;
	let item: MarkedElement | null = null;
	let brick: MarkedElement | null = null;
	let repeater: MarkedElement | null = null;
	let pointer: { x: number; y: number } | null = null;
	let selected: MarkedElement | null = null;
	let drag: Drag | null = null;
	let hints: Array<{ element: Element; box: HTMLElement }> = [];
	let pending: { target: PreviewFieldTarget; until: number } | null = null;
	let reported = "";
	let scrolling = false;
	let scrollTimer: number | undefined;
	let flashTimer: number | undefined;
	let scrollFrame: number | undefined;
	let landedTimer: number | undefined;
	let ui: ReturnType<typeof buildUi> | null = null;
	//* the field asked to be edited, with where it was clicked to put the caret there
	let editRequest: {
		marked: MarkedElement;
		point: { x: number; y: number } | null;
	} | null = null;
	//* the field being typed into, whose target the builder knows it by
	let typing: PreviewFieldTarget | null = null;
	//* while the builder zooms, the viewport's height changes, which scrolling makes up for
	let zooming = false;
	let viewportHeight = targetWindow.innerHeight;
	let dropAnchor: { y: number; until: number } | null = null;
	const inline = createInlineEditing({
		targetWindow,
		onInput: (value) => {
			if (typing) options.sendInlineInput(typing, value);
		},
		onEnd: (cancelled) => {
			const target = typing;
			typing = null;
			if (target) options.sendInlineEnd(target, cancelled);
			schedule();
		},
	});
	//* elements moved to show where a drag would land, until the page re-renders or they move back
	const shifts = new Map<
		Element,
		{ offset: Offset; opacity: number; animation: Animation }
	>();
	//* names for elements in hover reports, which stay the same while the element does
	const elementKeys = new WeakMap<Element, number>();
	let nextElementKey = 0;

	const isEdited = (target: PreviewFieldTarget) =>
		editing !== null && isEditedTarget(target, editing);
	const isTyping = (marked: MarkedElement | null) =>
		marked !== null && marked.element === inline.element();
	const isInvalid = (marked: MarkedElement | null) =>
		editing !== null &&
		marked !== null &&
		hasPreviewError(editing.errors, marked.target);
	const schedule = () => ui?.layer.schedule();

	// ----------------------------------------
	// Layer
	/** Everything drawn on the page, made the first time it's needed. */
	function buildUi() {
		const layer = createLayer(targetWindow, previewOverlayStyles, draw);
		const box = (className: string) => {
			const element = create(document, "div", `${className} floating`);
			element.hidden = true;
			return element;
		};
		const parts = {
			layer,
			hints: create(document, "div", ""),
			fill: box("fill"),
			selected: box("selected"),
			landing: box("landing"),
		};
		layer.root.append(parts.hints, parts.fill, parts.selected, parts.landing);
		return parts;
	}
	const getUi = () => {
		ui ??= buildUi();
		return ui;
	};

	// ----------------------------------------
	// Drawing
	const keyOf = (element: Element) => {
		let key = elementKeys.get(element);
		if (key === undefined) {
			key = nextElementKey++;
			elementKeys.set(element, key);
		}
		return key;
	};

	/** A brick or item for the builder: where it is, and its neighbours on the page to move it next to. */
	const blockOf = (marked: MarkedElement | null): PreviewHoverBlock | null => {
		const rect = visibleRect(marked);
		if (!marked || !rect) return null;
		const siblings = siblingsOf(document, marked);
		const index = siblings.findIndex(
			(sibling) => sibling.element === marked.element,
		);
		return {
			key: keyOf(marked.element),
			target: marked.target,
			rect: roundRect(rect),
			previous: siblings[index - 1]?.target ?? null,
			next: (index === -1 ? null : siblings[index + 1]?.target) ?? null,
			horizontal:
				kindOf(marked) === "item" &&
				isHorizontal(
					siblings.slice(0, 2).map((sibling) => rectOf(sibling.element)),
				),
		};
	};

	/** Tells the builder what the pointer is over when that, or where it is, changed. Returns whether it did. */
	const report = () => {
		if (!editing || !options.isConnected()) return false;
		const repeaterRect = visibleRect(repeater);
		const selectedRect = visibleRect(selected);
		const hover: PreviewHover = {
			brick: blockOf(brick),
			item: blockOf(item),
			repeater:
				repeater && repeaterRect
					? {
							key: keyOf(repeater.element),
							target: repeater.target,
							rect: roundRect(repeaterRect),
						}
					: null,
			selected:
				selected && selectedRect
					? {
							key: keyOf(selected.element),
							target: selected.target,
							rect: roundRect(selectedRect),
						}
					: null,
			pointer,
			inset:
				brick || item || repeater || selected
					? Math.round(topInset(targetWindow))
					: 0,
			scrolling,
		};
		const key = JSON.stringify(hover);
		if (key === reported) return false;
		reported = key;
		options.sendHover(hover);
		return true;
	};

	const resolvePending = () => {
		if (!pending) return;
		if (performance.now() > pending.until) {
			pending = null;
			return;
		}
		const [element] = findRendered(document, pending.target, true);
		if (!element) return;
		pending = null;
		showSelection(element);
	};

	function draw() {
		if (!ui) return false;
		field = resolveMarked(document, field);
		item = resolveMarked(document, item);
		brick = resolveMarked(document, brick);
		repeater = resolveMarked(document, repeater);
		selected = resolveMarked(document, selected);
		resolvePending();

		let moved = false;
		const place = (element: HTMLElement, rect: PreviewRect | null) => {
			element.hidden = rect === null;
			if (rect) moved = setBox(element, rect) || moved;
		};

		//* Alt hints work outside edit mode, for any document
		for (const hint of hints) {
			const rect = rectOf(hint.element);
			place(
				hint.box,
				rect.width || rect.height ? outlineOf(targetWindow, rect) : null,
			);
		}

		const hovered =
			editing && field && !sameElement(field, selected) && !drag ? field : null;
		const fieldRect = visibleRect(hovered);
		place(ui.fill, fieldRect ? outlineOf(targetWindow, fieldRect) : null);
		//* a repeater holding several items gets a light ring rather than a wash over all of them
		ui.fill.classList.toggle(
			"fill--container",
			editing !== null &&
				hovered !== null &&
				isRepeater(editing, hovered.target),
		);
		ui.fill.classList.toggle("fill--invalid", isInvalid(hovered));
		const selectedRect = selected && !drag ? visibleRect(selected) : null;
		place(
			ui.selected,
			selectedRect ? outlineOf(targetWindow, selectedRect) : null,
		);
		ui.selected.classList.toggle(
			"selected--filled",
			selected !== null && kindOf(selected) !== "brick",
		);
		ui.selected.classList.toggle("selected--invalid", isInvalid(selected));
		ui.selected.classList.toggle("selected--typing", isTyping(selected));
		//* follows the dragged element as it moves to where it would land
		const landingRect = drag ? visibleRect(drag.owner) : null;
		place(
			ui.landing,
			landingRect ? outlineOf(targetWindow, landingRect) : null,
		);

		return report() || moved;
	}

	// ----------------------------------------
	// Selection
	//* the user's own selection replaces one still waiting for its element
	const select = (marked: MarkedElement | null) => {
		pending = null;
		selected = marked;
		if (marked) options.sendFocus(marked.target);
		else options.sendDeselect();
		schedule();
	};
	/** Selects an element the builder pointed out, scrolling to it and pulsing its ring. */
	function showSelection(element: Element) {
		const target = readTarget(element);
		if (!target) return;
		const parts = getUi();
		selected = { element, target };
		if (!isInView(targetWindow, element)) {
			scrollToElement(targetWindow, element);
		}
		parts.selected.classList.remove("selected--pulse");
		void parts.selected.offsetWidth;
		parts.selected.classList.add("selected--pulse");
		targetWindow.clearTimeout(flashTimer);
		//* outside edit mode it's only a flash, as nothing else clears it
		if (!editing) {
			flashTimer = targetWindow.setTimeout(() => {
				selected = null;
				schedule();
			}, FLASH_MS);
		}
		schedule();
	}

	/** Asks the builder to edit a selected field, which answers by starting typing on the page or opening it in its fields. */
	const requestEdit = (
		marked: MarkedElement,
		point: { x: number; y: number } | null,
	) => {
		editRequest = { marked, point };
		options.sendEdit(marked.target, readPlainText(marked.element));
	};

	/** Moves a brick or item next to its neighbour, one step earlier or later on the page. */
	const step = (owner: MarkedElement, offset: -1 | 1) => {
		const siblings = siblingsOf(document, owner);
		const index = siblings.findIndex(
			(sibling) => sibling.element === owner.element,
		);
		const anchor = siblings[index + offset];
		if (index === -1 || !anchor) return;
		options.sendMove(
			owner.target,
			offset < 0 ? "before" : "after",
			anchor.target,
		);
	};

	// ----------------------------------------
	// Dragging
	const ownerIndex = (current: Drag) =>
		current.list.findIndex(
			(entry) => entry.marked.element === current.owner.element,
		);
	/** Where a drag would land, measured against where its siblings were, as they move to make room. */
	const slotAt = (current: Drag): Slot | null => {
		const x = current.x + targetWindow.scrollX;
		const y = current.y + targetWindow.scrollY;
		const from = ownerIndex(current);
		let nearest = -1;
		let distance = Number.POSITIVE_INFINITY;
		for (const [index, { rect }] of current.list.entries()) {
			if (index === from || (rect.width === 0 && rect.height === 0)) continue;
			const next = distanceTo(rect, x, y);
			if (next < distance) {
				nearest = index;
				distance = next;
			}
		}
		const anchor = current.list[nearest];
		if (!anchor) return null;
		const { rect } = anchor;
		const place: PreviewPlace = current.horizontal
			? x < rect.x + rect.width / 2
				? "before"
				: "after"
			: y < rect.y + rect.height / 2
				? "before"
				: "after";
		//* dropping either side of itself leaves it where it is
		if (
			(place === "before" && nearest === from + 1) ||
			(place === "after" && nearest === from - 1)
		) {
			return null;
		}
		return { anchor: anchor.marked, place };
	};

	/** Starts a drag of a brick or item, measuring it and its siblings where the page has them. Null when it isn't on the page. */
	const beginDrag = (
		target: PreviewFieldTarget,
		source: Drag["source"],
	): Drag | null => {
		const element = findRendered(document, target, true).find(
			(rendered) => visibleRect({ element: rendered, target }) !== null,
		);
		if (!element) return null;
		const owner = { element, target };
		//* a drop still waiting for the page to re-render goes back, to measure where things are
		settle();
		stopDrag();
		const list = siblingsOf(document, owner).map((marked) => {
			const rect = rectOf(marked.element);
			return {
				marked,
				rect: {
					...rect,
					x: rect.x + targetWindow.scrollX,
					y: rect.y + targetWindow.scrollY,
				},
			};
		});
		return {
			source,
			owner,
			list,
			horizontal:
				kindOf(owner) === "item" &&
				isHorizontal(list.slice(0, 2).map((entry) => entry.rect)),
			x: 0,
			y: 0,
			slot: null,
		};
	};

	/** Measures where a drag's elements are in the document, as the page lays them out without the drag's shifts. */
	const measureList = (current: Drag) => {
		current.list = current.list.map(({ marked }) => {
			const rect = rectOf(marked.element);
			const [x = "0", y = "0"] = targetWindow
				.getComputedStyle(marked.element)
				.translate.split(" ");
			return {
				marked,
				rect: {
					...rect,
					x: rect.x - (Number.parseFloat(x) || 0) + targetWindow.scrollX,
					y: rect.y - (Number.parseFloat(y) || 0) + targetWindow.scrollY,
				},
			};
		});
	};

	/** Animates an element to an offset from where the page has it, starting from wherever it is now. */
	const shiftTo = (element: Element, offset: Offset, opacity = 1) => {
		const current = shifts.get(element);
		if (
			current &&
			current.offset.x === offset.x &&
			current.offset.y === offset.y &&
			current.opacity === opacity
		) {
			return current.animation;
		}
		if (!current && offset.x === 0 && offset.y === 0 && opacity === 1) {
			return null;
		}
		const style = targetWindow.getComputedStyle(element);
		const from = {
			translate: style.translate || "none",
			opacity: style.opacity || "1",
		};
		current?.animation.cancel();
		const reducedMotion =
			targetWindow.matchMedia?.("(prefers-reduced-motion: reduce)").matches ===
			true;
		const animation = element.animate(
			[
				from,
				{ translate: `${offset.x}px ${offset.y}px`, opacity: String(opacity) },
			],
			{
				duration: reducedMotion ? 0 : SHIFT_MS,
				easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
				fill: "forwards",
			},
		);
		shifts.set(element, { offset, opacity, animation });
		schedule();
		return animation;
	};
	const release = (element: Element, animation: Animation) => {
		if (shifts.get(element)?.animation !== animation) return;
		animation.cancel();
		shifts.delete(element);
	};
	/** Lets go of moved elements at once, eg. once the page re-renders with them where they were shown. */
	const settle = () => {
		targetWindow.clearTimeout(landedTimer);
		for (const { animation } of shifts.values()) animation.cancel();
		shifts.clear();
		schedule();
	};
	/** Moves elements back to where the page has them, then lets go of them. */
	const restore = () => {
		targetWindow.clearTimeout(landedTimer);
		for (const element of [...shifts.keys()]) {
			const animation = shiftTo(element, { x: 0, y: 0 });
			if (!animation) continue;
			if (animation.playState === "finished") release(element, animation);
			else {
				animation.addEventListener(
					"finish",
					() => release(element, animation),
					{ once: true },
				);
			}
		}
	};
	/** Holds what was dropped where it was shown landing, at full strength, until the page re-renders with the move, or moves it back after a while. */
	const holdLanded = (element: Element) => {
		const landed = shifts.get(element);
		if (landed) shiftTo(element, landed.offset);
		landedTimer = targetWindow.setTimeout(restore, LANDED_MS);
	};
	/** Shows what's dragged, faint, where it would land, with the siblings it passes making room. */
	const showLanding = (current: Drag) => {
		const from = ownerIndex(current);
		const anchor = current.list.findIndex(
			(entry) => entry.marked.element === current.slot?.anchor.element,
		);
		//* the index it would have once taken out and put next to the anchor
		const to =
			anchor === -1
				? from
				: (anchor > from ? anchor - 1 : anchor) +
					(current.slot?.place === "after" ? 1 : 0);
		const offsets = reorderOffsets(
			current.list.map((entry) => entry.rect),
			from,
			to,
		);
		for (const [index, entry] of current.list.entries()) {
			shiftTo(
				entry.marked.element,
				offsets[index] ?? { x: 0, y: 0 },
				index === from ? DRAGGED_OPACITY : 1,
			);
		}
	};
	/** Works out where the drag would land, showing it there when that changed. */
	const follow = (current: Drag) => {
		const slot = slotAt(current);
		const changed =
			slot?.anchor.element !== current.slot?.anchor.element ||
			slot?.place !== current.slot?.place;
		current.slot = slot;
		if (changed) showLanding(current);
		schedule();
	};

	const autoScroll = () => {
		scrollFrame = undefined;
		if (!drag) return;
		const speed =
			drag.y < SCROLL_EDGE
				? -(SCROLL_EDGE - drag.y) / 3
				: drag.y > targetWindow.innerHeight - SCROLL_EDGE
					? (drag.y - (targetWindow.innerHeight - SCROLL_EDGE)) / 3
					: 0;
		if (speed !== 0) {
			targetWindow.scrollBy(0, speed);
			follow(drag);
		}
		scrollFrame = targetWindow.requestAnimationFrame(autoScroll);
	};
	const stopDrag = () => {
		drag = null;
		if (scrollFrame !== undefined) {
			targetWindow.cancelAnimationFrame(scrollFrame);
		}
		scrollFrame = undefined;
		schedule();
	};

	// ----------------------------------------
	// Page events
	const clearHover = () => {
		field = null;
		pointer = null;
		schedule();
	};

	const showHints = () => {
		if (editing || hints.length > 0 || !options.isConnected()) return;
		const parts = getUi();
		hints = [...document.querySelectorAll(`[${previewFieldAttribute}]`)]
			.filter((element) => readTarget(element) !== null)
			.map((element) => {
				const box = create(document, "div", "hint floating");
				box.hidden = true;
				return { element, box };
			});
		parts.hints.replaceChildren(...hints.map((hint) => hint.box));
		schedule();
	};
	const hideHints = () => {
		if (hints.length === 0) return;
		hints = [];
		ui?.hints.replaceChildren();
		schedule();
	};

	const onPointerMove = (event: PointerEvent) => {
		if (!editing || drag) return;
		const chain = markedAlong(event.composedPath(), isEdited);
		field = chain.find((marked) => kindOf(marked) !== "brick") ?? null;
		item = chain.find((marked) => kindOf(marked) === "item") ?? null;
		brick =
			chain.find(
				(marked) =>
					kindOf(marked) === "brick" && marked.target.brick?.type === "builder",
			) ?? null;
		repeater = field && isRepeater(editing, field.target) ? field : null;
		pointer = { x: Math.round(event.clientX), y: Math.round(event.clientY) };
		getUi();
		schedule();
	};
	//* bricks and items stay reported once the pointer leaves, so the builder can keep their controls while the pointer reaches them
	const onPointerOut = (event: PointerEvent) => {
		if (event.relatedTarget === null) clearHover();
	};
	/**
	 * Zooming changes the viewport's height. Scrolling by as much keeps what's dragged under the
	 * pointer, or what was dropped or selected where it's drawn, rather than drifting up or down.
	 */
	const onResize = () => {
		const height = targetWindow.innerHeight;
		const ratio = viewportHeight > 0 ? height / viewportHeight : 1;
		viewportHeight = height;
		if (!zooming || ratio === 1) return;
		const middleOf = (marked: MarkedElement | null) => {
			const rect = visibleRect(marked);
			return rect ? rect.y + rect.height / 2 : null;
		};
		const anchor =
			(drag?.source === "page" ? drag.y : null) ??
			(dropAnchor && performance.now() < dropAnchor.until
				? dropAnchor.y
				: null) ??
			middleOf(drag?.owner ?? null) ??
			middleOf(selected);
		if (anchor === null) return;
		targetWindow.scrollBy({ top: anchor * (1 - ratio), behavior: "instant" });
		if (dropAnchor) dropAnchor.y = anchor * ratio;
		if (drag) {
			//* sizes tied to the viewport's height change too
			measureList(drag);
			showLanding(drag);
			if (drag.source === "page") {
				drag.y = anchor * ratio;
				follow(drag);
			}
		}
	};
	const onScroll = () => {
		scrolling = true;
		targetWindow.clearTimeout(scrollTimer);
		scrollTimer = targetWindow.setTimeout(() => {
			scrolling = false;
			schedule();
		}, SCROLL_SETTLE_MS);
	};
	const onClick = (event: MouseEvent) => {
		if (event.button !== 0) return;
		//* Alt-click opens any document's field, plain clicks only the edited one's, and modified clicks still follow links
		if (event.altKey) {
			const [marked] = markedAlong(event.composedPath(), () => true);
			if (!marked || !options.sendFocus(marked.target)) return;
		} else if (editing && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
			const typed = inline.element();
			//* clicks in the text being typed move its caret, without following a link around it
			if (typed && event.composedPath().includes(typed)) {
				event.preventDefault();
				event.stopImmediatePropagation();
				return;
			}
			const [marked] = markedAlong(event.composedPath(), isEdited);
			if (!marked) {
				select(null);
				return;
			}
			pending = null;
			//* a selected field clicked again is edited
			if (
				editing.editable &&
				kindOf(marked) === "field" &&
				sameElement(marked, selected)
			) {
				requestEdit(marked, { x: event.clientX, y: event.clientY });
			} else {
				selected = marked;
				schedule();
				if (!options.sendFocus(marked.target)) return;
			}
		} else {
			return;
		}
		event.preventDefault();
		event.stopImmediatePropagation();
	};
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Alt") showHints();
		if (!editing || event.defaultPrevented) return;
		const origin = event.composedPath()[0];
		if (
			origin instanceof HTMLInputElement ||
			origin instanceof HTMLTextAreaElement ||
			(origin instanceof HTMLElement && origin.isContentEditable)
		) {
			return;
		}
		if (event.key === "Escape") {
			select(null);
			return;
		}
		//* Enter edits the selected field, unless something else on the page has focus, such as a button
		const active = document.activeElement;
		if (
			event.key === "Enter" &&
			editing.editable &&
			selected &&
			kindOf(selected) === "field" &&
			!event.altKey &&
			(!active ||
				active === document.body ||
				active.contains(selected.element) ||
				selected.element.contains(active))
		) {
			event.preventDefault();
			requestEdit(selected, null);
			return;
		}
		//* ⌥ and the arrow keys move the item or brick holding the selection
		const offset =
			event.key === "ArrowUp" || event.key === "ArrowLeft"
				? -1
				: event.key === "ArrowDown" || event.key === "ArrowRight"
					? 1
					: 0;
		if (!event.altKey || offset === 0 || !selected || !editing.editable) {
			return;
		}
		const ancestors: Element[] = [];
		for (
			let element: Element | null = selected.element;
			element;
			element = element.parentElement
		) {
			ancestors.push(element);
		}
		const owner = markedAlong(ancestors, isEdited).find(
			(marked) =>
				kindOf(marked) === "item" ||
				(kindOf(marked) === "brick" && marked.target.brick?.type === "builder"),
		);
		if (!owner) return;
		event.preventDefault();
		step(owner, offset);
	};
	const onKeyUp = (event: KeyboardEvent) => {
		if (event.key === "Alt") hideHints();
	};
	const onBlur = () => {
		hideHints();
		clearHover();
	};
	const onVisibilityChange = () => {
		if (document.hidden) onBlur();
	};

	targetWindow.addEventListener("keydown", onKeyDown);
	targetWindow.addEventListener("keyup", onKeyUp);
	targetWindow.addEventListener("blur", onBlur);
	targetWindow.addEventListener("scroll", onScroll, {
		capture: true,
		passive: true,
	});
	targetWindow.addEventListener("resize", onResize);
	document.addEventListener("visibilitychange", onVisibilityChange);
	document.addEventListener("pointermove", onPointerMove, {
		capture: true,
		passive: true,
	});
	document.addEventListener("pointerout", onPointerOut, true);
	document.addEventListener("click", onClick, true);

	return {
		/** Turns edit mode on for a document, or off with null. */
		setEditing: (next: PreviewEditing | null) => {
			//* errors change while editing, which leaves the rest as it is
			const same =
				editing !== null &&
				next !== null &&
				editing.collectionKey === next.collectionKey &&
				editing.documentId === next.documentId &&
				editing.editable === next.editable;
			editing = next;
			if (same) {
				schedule();
				return;
			}
			inline.stop();
			editRequest = null;
			if (drag) restore();
			stopDrag();
			hideHints();
			field = null;
			item = null;
			brick = null;
			repeater = null;
			pointer = null;
			reported = "";
			if (!next) {
				selected = null;
				pending = null;
			} else getUi();
			schedule();
		},
		/** Selects a field, item or brick focused in the builder, waiting a moment for it when it isn't on the page yet. */
		highlight: (target: PreviewFieldTarget) => {
			const exact = findRendered(document, target, true);
			const [element] =
				exact.length > 0 ? exact : findRendered(document, target);
			pending =
				exact.length > 0
					? null
					: { target, until: performance.now() + PENDING_HIGHLIGHT_MS };
			if (element) showSelection(element);
			else getUi();
		},
		/** Shows a brick the builder drags in its fields as being moved, scrolling to it, or stops with null. */
		showDragged: (
			target: PreviewFieldTarget | null,
			landing: PreviewLanding | null,
		) => {
			if (!target) {
				const current = drag;
				if (current?.source !== "builder") return;
				stopDrag();
				if (current.slot) holdLanded(current.owner.element);
				else restore();
				return;
			}
			if (
				drag?.source !== "builder" ||
				!isSamePreviewTarget(drag.owner.target, target)
			) {
				const next = beginDrag(target, "builder");
				if (!next) return;
				drag = next;
				if (!isInView(targetWindow, next.owner.element)) {
					scrollToElement(targetWindow, next.owner.element);
				}
			}
			const current = drag;
			const anchor = landing
				? current.list.find((entry) =>
						isSamePreviewTarget(entry.marked.target, landing.anchor),
					)
				: undefined;
			current.slot =
				anchor && landing
					? { anchor: anchor.marked, place: landing.place }
					: null;
			showLanding(current);
			getUi();
			schedule();
		},
		/** Keeps what's dragged or selected in place while the builder zooms the page out or back in. */
		setZooming: (next: boolean) => {
			zooming = next;
			viewportHeight = targetWindow.innerHeight;
		},
		/** Asks to edit a field, as clicking it again would, once it's the selected one. */
		editSelected: (target: PreviewFieldTarget) => {
			if (
				!editing?.editable ||
				!selected ||
				!isSamePreviewTarget(selected.target, target)
			) {
				return;
			}
			requestEdit(selected, null);
		},
		/**
		 * Starts typing into a field the builder agreed to, where it was clicked or at its end.
		 * Says typing ended straight away when its element has gone or can't be typed into.
		 */
		startInline: (
			target: PreviewFieldTarget,
			props: { multiline: boolean; clear: boolean },
		) => {
			const request =
				editRequest &&
				editRequest.marked.element.isConnected &&
				isSamePreviewTarget(editRequest.marked.target, target)
					? editRequest
					: null;
			editRequest = null;
			const element =
				request?.marked.element ?? findRendered(document, target, true)[0];
			const started =
				editing?.editable === true &&
				isEdited(target) &&
				element instanceof HTMLElement &&
				inline.start(element, { ...props, point: request?.point ?? null });
			if (!started || !element) {
				options.sendInlineEnd(target, true);
				return;
			}
			typing = target;
			selected = { element, target };
			getUi();
			schedule();
		},
		/** Follows a brick or item the builder's handle drags, showing where it would land. */
		drag: (target: PreviewFieldTarget, x: number, y: number) => {
			if (!editing?.editable || !isEdited(target)) return;
			if (
				drag?.source !== "page" ||
				!isSamePreviewTarget(drag.owner.target, target)
			) {
				const next = beginDrag(target, "page");
				if (!next) return;
				drag = next;
				showLanding(drag);
				scrollFrame = targetWindow.requestAnimationFrame(autoScroll);
			}
			drag.x = x;
			drag.y = y;
			getUi();
			follow(drag);
		},
		/**
		 * Ends a drag. Dropped, what was dragged stays where it was shown landing until the page
		 * re-renders with the move, or moves back if it doesn't. Otherwise everything moves back.
		 */
		endDrag: (drop: boolean) => {
			const current = drag;
			if (current?.source !== "page") return;
			stopDrag();
			dropAnchor = { y: current.y, until: performance.now() + DROP_ANCHOR_MS };
			//* the page may have re-rendered during the drag, changing their targets
			const owner = resolveMarked(document, current.owner);
			const anchor = resolveMarked(document, current.slot?.anchor ?? null);
			if (!drop || !current.slot || !owner || !anchor) {
				restore();
				return;
			}
			options.sendMove(owner.target, current.slot.place, anchor.target);
			holdLanded(current.owner.element);
		},
		/** Lets go of what a drop moved, once the page has re-rendered with it. */
		settle,
		cleanup: () => {
			targetWindow.removeEventListener("keydown", onKeyDown);
			targetWindow.removeEventListener("keyup", onKeyUp);
			targetWindow.removeEventListener("blur", onBlur);
			targetWindow.removeEventListener("scroll", onScroll, { capture: true });
			targetWindow.removeEventListener("resize", onResize);
			document.removeEventListener("visibilitychange", onVisibilityChange);
			document.removeEventListener("pointermove", onPointerMove, {
				capture: true,
			});
			document.removeEventListener("pointerout", onPointerOut, true);
			document.removeEventListener("click", onClick, true);
			inline.stop();
			targetWindow.clearTimeout(flashTimer);
			targetWindow.clearTimeout(scrollTimer);
			settle();
			stopDrag();
			ui?.layer.remove();
			ui = null;
			editing = null;
			selected = null;
			pending = null;
			hints = [];
		},
	};
};
