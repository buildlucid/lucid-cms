import type { PreviewRect } from "../protocol/index.js";

type Offset = { x: number; y: number };

/** Whether rects follow one another along an axis, eg. a column of bricks or a row of cards, rather than wrapping. */
const inLine = (rects: PreviewRect[], axis: "x" | "y") => {
	const size = axis === "x" ? "width" : "height";
	return rects.every((rect, index) => {
		const previous = rects[index - 1];
		return !previous || rect[axis] >= previous[axis] + previous[size] - 1;
	});
};

/**
 * Calculates element offsets for moving `from` to `to`. Rows and columns preserve gaps; wrapping
 * grids shift elements into neighbouring slots.
 */
export const reorderOffsets = (
	rects: PreviewRect[],
	from: number,
	to: number,
): Offset[] => {
	const moved = rects[from];
	const target = rects[to];
	const step = to > from ? 1 : -1;
	const neighbour = rects[from + step];
	if (!moved || !target || !neighbour || from === to) {
		return rects.map(() => ({ x: 0, y: 0 }));
	}
	const passed = (index: number) =>
		step > 0 ? index > from && index <= to : index >= to && index < from;

	const axis = inLine(rects, "y") ? "y" : inLine(rects, "x") ? "x" : null;
	if (!axis) {
		return rects.map((rect, index) => {
			const slot =
				index === from
					? target
					: passed(index)
						? (rects[index - step] ?? rect)
						: rect;
			return { x: slot.x - rect.x, y: slot.y - rect.y };
		});
	}

	const size = axis === "x" ? "width" : "height";
	const end = (rect: PreviewRect) => rect[axis] + rect[size];
	//* moving later, it ends where the last one it passes ended; moving earlier, it starts where the first did
	const shift =
		step > 0 ? moved[axis] - neighbour[axis] : end(moved) - end(neighbour);
	const landing =
		step > 0 ? end(target) - end(moved) : target[axis] - moved[axis];
	return rects.map((_, index) => {
		const distance = index === from ? landing : passed(index) ? shift : 0;
		return axis === "x" ? { x: distance, y: 0 } : { x: 0, y: distance };
	});
};
