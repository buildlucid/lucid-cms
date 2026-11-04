/**
 * Custom elements' server markup, recorded by `@lucidcms/client` before they hydrate. Once
 * hydrated, their DOM is client-owned, so changed server markup replaces the whole element.
 */
export type ServerMarkup = WeakMap<Element, string>;

export const isCustomElement = (element: Element) =>
	element.localName.includes("-");

/** Records the server markup of the custom elements in a subtree, before it is inserted or they upgrade and hydrate. */
export const recordServerMarkup = (markup: ServerMarkup, node: Node) => {
	if (node.nodeType !== Node.ELEMENT_NODE) return;
	const root = node as Element;
	if (isCustomElement(root)) markup.set(root, root.outerHTML);
	for (const element of root.querySelectorAll("*")) {
		if (isCustomElement(element)) markup.set(element, element.outerHTML);
	}
};
