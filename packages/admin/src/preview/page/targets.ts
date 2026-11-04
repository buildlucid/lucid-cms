import {
	arePreviewSiblings,
	decodePreviewFieldTarget,
	isSamePreviewTarget,
	type PreviewEditing,
	type PreviewFieldTarget,
	previewFieldAttribute,
} from "../protocol/index.js";

/** A page element and the field, repeater item or brick it renders. */
export type MarkedElement = {
	element: Element;
	target: PreviewFieldTarget;
};

//* decoded once per attribute value, as pointer moves read them constantly
const decoded = new WeakMap<
	Element,
	{ value: string; target: PreviewFieldTarget | null }
>();

export const isElement = (value: EventTarget): value is Element =>
	typeof (value as Element).getAttribute === "function";

/** The field or brick an element is marked with, or null. */
export const readTarget = (element: Element): PreviewFieldTarget | null => {
	const value = element.getAttribute(previewFieldAttribute);
	if (value === null) return null;
	const cached = decoded.get(element);
	if (cached?.value === value) return cached.target;
	const target = decodePreviewFieldTarget(value);
	decoded.set(element, { value, target });
	return target;
};

/** Whether a target is in the document being edited. */
export const isEditedTarget = (
	target: PreviewFieldTarget,
	editing: PreviewEditing,
) =>
	target.collectionKey === editing.collectionKey &&
	target.documentId === editing.documentId;

/** Marked elements along an event's path, innermost first, skipping targets `accept` turns down. */
export const markedAlong = (
	path: EventTarget[],
	accept: (target: PreviewFieldTarget) => boolean,
): MarkedElement[] =>
	path.flatMap((item) => {
		if (!isElement(item)) return [];
		const target = readTarget(item);
		return target && accept(target) ? [{ element: item, target }] : [];
	});

const allMarked = (root: ParentNode): MarkedElement[] =>
	[...root.querySelectorAll(`[${previewFieldAttribute}]`)].flatMap(
		(element) => {
			const target = readTarget(element);
			return target ? [{ element, target }] : [];
		},
	);

/**
 * The page's elements for a target. Unless `exact`, those for the nearest thing around it that
 * is marked when none render it, such as its repeater item or brick.
 */
export const findRendered = (
	root: ParentNode,
	target: PreviewFieldTarget,
	exact = false,
): Element[] => {
	const marked = allMarked(root);
	for (let length = target.path.length; length >= 0; length -= 1) {
		if (length === 0 && !target.brick) break;
		const around = { ...target, path: target.path.slice(0, length) };
		const elements = marked
			.filter((item) => isSamePreviewTarget(item.target, around))
			.map((item) => item.element);
		if (elements.length > 0 || exact) return elements;
	}
	return [];
};

/**
 * Finds the target after re-render, rereading its marker if retained or locating its replacement.
 * Returns null if removed.
 */
export const resolveMarked = (
	root: ParentNode,
	marked: MarkedElement | null,
): MarkedElement | null => {
	if (!marked) return null;
	if (marked.element.isConnected) {
		const target = readTarget(marked.element);
		if (target && isSamePreviewTarget(target, marked.target)) return marked;
		if (target) return { element: marked.element, target };
	}
	return (
		allMarked(root).find((item) =>
			isSamePreviewTarget(item.target, marked.target),
		) ?? null
	);
};

/** The rendered bricks of its document, or items of its repeater, that a brick or item moves among, in page order. */
export const siblingsOf = (
	root: ParentNode,
	marked: MarkedElement,
): MarkedElement[] =>
	allMarked(root).filter((item) =>
		arePreviewSiblings(marked.target, item.target),
	);
