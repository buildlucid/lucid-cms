const PILL_OFFSET = 10;
const VIEWPORT_PADDING = 8;

type Size = { width: number; height: number };

/**
 * Centres the selection pill over the selection, or below it when there is no
 * room above, and keeps it inside the viewport.
 */
export const getPillPosition = (
	selection: Pick<DOMRect, "top" | "left" | "bottom" | "width">,
	pill: Size,
	viewport: Size,
) => {
	const left = Math.min(
		Math.max(
			selection.left + selection.width / 2 - pill.width / 2,
			VIEWPORT_PADDING,
		),
		viewport.width - pill.width - VIEWPORT_PADDING,
	);
	const above = selection.top >= pill.height + PILL_OFFSET + VIEWPORT_PADDING;
	const top = Math.min(
		Math.max(
			above
				? selection.top - pill.height - PILL_OFFSET
				: selection.bottom + PILL_OFFSET,
			VIEWPORT_PADDING,
		),
		viewport.height - pill.height - VIEWPORT_PADDING,
	);
	return { top, left };
};
