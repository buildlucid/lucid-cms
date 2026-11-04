const isCustomElement = (element: Element) => element.localName.includes("-");

/** Records custom elements' server markup before hydration for later morph comparisons. */
export const recordServerMarkup = (document: Document) => {
	const markup = new WeakMap<Element, string>();
	const record = () => {
		for (const element of document.body.querySelectorAll("*")) {
			if (isCustomElement(element)) markup.set(element, element.outerHTML);
		}
	};
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", record, { once: true });
	} else {
		record();
	}
	return markup;
};
