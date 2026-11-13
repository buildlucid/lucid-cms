import { previewToolbarItems, previewToolbarViewItems } from "../constants";
import type { PreviewToolbarItemKey, PreviewToolbarPosition } from "../types";

/** Sits between the items that size the page and the rest of the toolbar. */
export const toolbarDivider = { divider: true } as const;

const isViewItem = (key: PreviewToolbarItemKey) =>
	previewToolbarViewItems.some((item) => item === key);

/**
 * Orders built-ins and anchored plugin entries, preserving entry order and object identity for
 * keyed rendering. Unmatched entries go last. Inserts a divider after view controls when more
 * items follow.
 */
export const placeToolbarItems = <
	TItem extends { key: PreviewToolbarItemKey },
	TEntry extends { position?: PreviewToolbarPosition },
>(
	items: readonly TItem[],
	entries: readonly TEntry[],
) => {
	const side = (entry: TEntry) => {
		const position: Partial<Record<"before" | "after", PreviewToolbarItemKey>> =
			entry.position ?? {};
		return position;
	};
	const shown = new Set(items.map((item) => item.key));
	const placed: Array<TItem | TEntry | typeof toolbarDivider> = [];
	let viewEnd = 0;

	for (const key of previewToolbarItems) {
		const item = items.find((candidate) => candidate.key === key);
		if (!item) continue;
		placed.push(
			...entries.filter((entry) => side(entry).before === key),
			item,
			...entries.filter((entry) => side(entry).after === key),
		);
		if (isViewItem(key)) viewEnd = placed.length;
	}
	placed.push(
		...entries.filter((entry) => {
			const anchor = side(entry).before ?? side(entry).after;
			return anchor === undefined || !shown.has(anchor);
		}),
	);
	if (viewEnd > 0 && viewEnd < placed.length) {
		placed.splice(viewEnd, 0, toolbarDivider);
	}

	return placed;
};
