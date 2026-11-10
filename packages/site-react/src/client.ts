import type { UiHydrate } from "@lucidcms/site/ui";
import { type ComponentType, createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, hydrateRoot } from "react-dom/client";
import { slotProps } from "./slots.js";

/** Hydrates a React component the server rendered, or renders one for `client: "only"`, with its slots' HTML. */
const hydrateComponent: UiHydrate<ComponentType<Record<string, unknown>>> = (
	element,
	component,
	props,
	slots,
	{ id, render },
) => {
	const parts = slotProps(
		props,
		Object.fromEntries(
			Object.entries(slots).map(([name, slot]) => [name, slot.innerHTML]),
		),
	);
	const app = createElement(component, parts.props, parts.children);
	if (!render) {
		const root = hydrateRoot(element, app, { identifierPrefix: id });
		return () => root.unmount();
	}
	const root = createRoot(element, { identifierPrefix: id });
	// The fallback is gone already, so render before the browser paints.
	flushSync(() => root.render(app));
	return () => root.unmount();
};

export default hydrateComponent;
