import type { PreviewPlace, PreviewRect } from "../protocol/index.js";
import { rectOf } from "./layer.js";
import { reorderOffsets } from "./reorder.js";
import type { MarkedElement } from "./targets.js";

const SHIFT_MS = 200;
//* how long a dropped brick or item stays where it was shown landing, waiting for the page to re-render with the move
const LANDED_MS = 4000;
//* how faint a dragged brick or item is where it would land
const DRAGGED_OPACITY = 0.4;

type Offset = { x: number; y: number };

/** Where a dragged brick or item would land: next to a sibling. */
export type Slot = { anchor: MarkedElement; place: PreviewPlace };

/** A brick or repeater item being moved, among its siblings. */
export type Drag = {
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

/** Whether siblings sit side by side, eg. cards in a row, rather than one above another. */
export const isHorizontal = (rects: PreviewRect[]) => {
	const [a, b] = rects;
	if (!a || !b) return false;
	return Math.abs(a.y - b.y) < Math.min(a.height, b.height) / 2;
};

const distanceTo = (rect: PreviewRect, x: number, y: number) =>
	Math.hypot(
		Math.max(rect.x - x, 0, x - rect.x - rect.width),
		Math.max(rect.y - y, 0, y - rect.y - rect.height),
	);

const ownerIndex = (current: Drag) =>
	current.list.findIndex(
		(entry) => entry.marked.element === current.owner.element,
	);

/** Where a drag would land, measured against where its siblings were, as they move to make room. */
export const slotAt = (targetWindow: Window, current: Drag): Slot | null => {
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

/** Measures where a drag's elements are in the document, as the page lays them out without the drag's shifts. */
export const measureDrag = (targetWindow: Window, current: Drag) => {
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

/**
 * Moves page elements aside to show where a drag would land, without changing the page's DOM.
 * A drop is held where it was shown until the page re-renders with the move, or moves back.
 */
export const createShifts = (targetWindow: Window, onChange: () => void) => {
	const shifts = new Map<
		Element,
		{ offset: Offset; opacity: number; animation: Animation }
	>();
	let landedTimer: number | undefined;

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
		onChange();
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
		onChange();
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

	return {
		settle,
		restore,
		/** Shows what's dragged, faint, where it would land, with the siblings it passes making room. */
		showLanding: (current: Drag) => {
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
		},
		/** Holds what was dropped where it was shown landing, at full strength, until the page re-renders with the move, or moves it back after a while. */
		holdLanded: (element: Element) => {
			const landed = shifts.get(element);
			if (landed) shiftTo(element, landed.offset);
			landedTimer = targetWindow.setTimeout(restore, LANDED_MS);
		},
	};
};
