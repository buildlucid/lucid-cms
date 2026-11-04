import type { PreviewRect } from "@/preview/protocol";

type Point = { x: number; y: number };
type Size = { width: number; height: number };

//* space between a handle and the top of what it moves
export const HANDLE_GAP = 6;

/** A handle's size in pixels: three 28px buttons in a bordered bar, which its classes match. */
export const HANDLE_SIZE = { width: 90, height: 32 } as const satisfies Size;

//* how far outlines sit outside what they outline, and the least they keep from the page's sides, in the page's pixels as it draws its own
const OUTLINE_OFFSET = 4;
const OUTLINE_EDGE = 3;
//* outlines' corner radius in the page's pixels, matching the page's
export const OUTLINE_RADIUS = 7;

/**
 * The outline around a brick or item on the page at the preview's zoom, which handles sit above:
 * outside it, and inside the preview's sides so full-width bricks keep theirs, as the page draws.
 */
export const outlineRect = (
	rect: PreviewRect,
	scale: number,
	width: number,
): PreviewRect => {
	const offset = OUTLINE_OFFSET * scale;
	const edge = OUTLINE_EDGE * scale;
	const left = Math.max(rect.x * scale - offset, edge);
	const right = Math.min((rect.x + rect.width) * scale + offset, width - edge);
	return {
		x: left,
		y: rect.y * scale - offset,
		width: Math.max(right - left, 0),
		height: rect.height * scale + offset * 2,
	};
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Puts a handle above the top left of a brick or item's outline, like a tab. With no room above,
 * it stays below the page's fixed header, inside the outline while any of it is in view.
 */
export const placeHandle = (
	rect: PreviewRect,
	view: { width: number; inset: number },
): Point => ({
	x: clamp(rect.x, 4, view.width - HANDLE_SIZE.width - 4),
	y: Math.min(
		Math.max(rect.y - HANDLE_SIZE.height - HANDLE_GAP, view.inset + 4),
		rect.y + rect.height - HANDLE_SIZE.height,
	),
});

//* handles closer than this side by side read as one
const HANDLE_SPACING = 4;

/** Whether two placed handles would touch. */
const touches = (a: Point, b: Point) =>
	a.x < b.x + HANDLE_SIZE.width + HANDLE_SPACING &&
	b.x < a.x + HANDLE_SIZE.width + HANDLE_SPACING &&
	a.y < b.y + HANDLE_SIZE.height &&
	b.y < a.y + HANDLE_SIZE.height;

/** Places an item's handle, at the item's top right instead when it would cover its brick's handle. */
export const placeItemHandle = (
	rect: PreviewRect,
	view: { width: number; inset: number },
	brickHandle: Point | null,
): Point => {
	const left = placeHandle(rect, view);
	if (!brickHandle || !touches(left, brickHandle)) return left;
	return placeHandle(
		{ ...rect, x: rect.x + rect.width - HANDLE_SIZE.width },
		view,
	);
};

/** How far a point is from a rect, zero inside it. */
export const distanceTo = (rect: PreviewRect, point: Point) =>
	Math.hypot(
		Math.max(rect.x - point.x, 0, point.x - rect.x - rect.width),
		Math.max(rect.y - point.y, 0, point.y - rect.y - rect.height),
	);
