/** Loads UI modules according to `<client-component>`'s `client` attribute, hydrating with server-rendered props and slots or replacing the fallback for `client="only"`. */
type HydrateModule = {
	default: (
		element: HTMLElement,
		props: Record<string, unknown>,
		slots: Record<string, Element>,
		context: { id: string; render: boolean },
	) => void | Promise<void>;
};

const hasBox = (element: Element) =>
	getComputedStyle(element).display !== "contents";

/** Finds boxes to observe through descendants without boxes, such as `<client-slot>`, using the nearest boxed ancestor when the component contains only text. */
const boxesOf = (element: HTMLElement): Element[] => {
	const boxes: Element[] = [];
	const visit = (parent: Element) => {
		for (const child of parent.children) {
			if (hasBox(child)) boxes.push(child);
			else visit(child);
		}
	};
	visit(element);
	if (boxes.length > 0) return boxes;
	let around = element.parentElement;
	while (around && !hasBox(around)) around = around.parentElement;
	return [around ?? document.documentElement];
};

/** Runs `start` once the element's `client` condition is met. */
const when = (element: HTMLElement, start: () => void) => {
	switch (element.getAttribute("client")) {
		case "idle":
			if ("requestIdleCallback" in window) requestIdleCallback(start);
			else setTimeout(start, 200);
			return;
		case "visible": {
			const observer = new IntersectionObserver((entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				observer.disconnect();
				start();
			});
			for (const box of boxesOf(element)) observer.observe(box);
			return;
		}
		case "media": {
			const query = matchMedia(element.getAttribute("media") ?? "all");
			if (query.matches) return start();
			query.addEventListener("change", start, { once: true });
			return;
		}
		default:
			start();
	}
};

/** The slots the server rendered for this element, skipping those of components inside it. */
const slotsOf = (element: HTMLElement) => {
	const slots: Record<string, Element> = {};
	for (const slot of element.querySelectorAll("client-slot")) {
		if (slot.closest("client-component") !== element) continue;
		const name = slot.getAttribute("name") ?? "default";
		slots[name] ??= slot;
	}
	return slots;
};

/** For a component that renders only in the browser: its slots from their templates, then an empty element. */
const takeTemplateSlots = (element: HTMLElement) => {
	const slots: Record<string, Element> = {};
	for (const template of element.querySelectorAll(
		":scope > template[data-slot]",
	)) {
		const slot = document.createElement("client-slot");
		const name = template.getAttribute("data-slot") ?? "default";
		slot.setAttribute("name", name);
		slot.style.display = "contents";
		slot.append((template as HTMLTemplateElement).content);
		slots[name] = slot;
	}
	element.replaceChildren();
	return slots;
};

class ClientComponent extends HTMLElement {
	#started = false;

	connectedCallback() {
		if (this.#started) return;
		this.#started = true;
		when(this, () => {
			const src = this.getAttribute("src");
			if (!src) return;
			const render = this.getAttribute("client") === "only";
			import(/* @vite-ignore */ src)
				.then((module: HydrateModule) =>
					module.default(
						this,
						JSON.parse(this.getAttribute("props") ?? "{}"),
						render ? takeTemplateSlots(this) : slotsOf(this),
						{ id: this.getAttribute("prefix") ?? "", render },
					),
				)
				.catch((error: unknown) => {
					console.error(`Failed to hydrate ${src}`, error);
				});
		});
	}
}

if (!customElements.get("client-component")) {
	customElements.define("client-component", ClientComponent);
}
