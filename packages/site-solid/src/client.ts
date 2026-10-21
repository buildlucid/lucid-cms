import type { UiHydrate } from "@lucidcms/plugin-site/ui";
import type { Component } from "solid-js";
import { createComponent, hydrate, render as renderInto } from "solid-js/web";

declare global {
	/** Solid's hydration state, which its server script would otherwise set up. */
	var _$HY:
		| {
				events: unknown[];
				completed: WeakSet<Element>;
				r: Record<string, unknown>;
				fe(): void;
		  }
		| undefined;
}

/** Hydrates Solid while keeping existing slot elements, or renders for `client: "only"`. */
const hydrateComponent: UiHydrate<Component<Record<string, unknown>>> = (
	element,
	component,
	props,
	slots,
	{ id, render },
) => {
	const { default: children, ...named } = slots;
	const app = () =>
		createComponent(component, {
			...props,
			...named,
			...(children && { children }),
		});
	if (render) {
		renderInto(app, element);
		return;
	}
	globalThis._$HY ??= { events: [], completed: new WeakSet(), r: {}, fe() {} };
	hydrate(app, element, { renderId: id });
};

export default hydrateComponent;
