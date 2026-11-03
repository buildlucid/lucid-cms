/**
 * Tracks custom elements' original server markup. Once hydrated, their DOM is client-owned;
 * changed server markup replaces the entire element.
 */
export const serverMarkup = new WeakMap<Element, string>();

export const isCustomElement = (element: Element) =>
	element.localName.includes("-");

/** Records the server markup of the custom elements in a subtree, before it is inserted or they upgrade and hydrate. */
export const recordServerMarkup = (node: Node) => {
	if (node.nodeType !== Node.ELEMENT_NODE) return;
	const root = node as Element;
	if (isCustomElement(root)) serverMarkup.set(root, root.outerHTML);
	for (const element of root.querySelectorAll("*")) {
		if (isCustomElement(element)) serverMarkup.set(element, element.outerHTML);
	}
};
