import type { UiHydrate } from "@lucidcms/plugin-site/ui";
import { type Component, Suspense } from "solid-js";
import { createComponent, hydrate, render as renderInto } from "solid-js/web";

/** Hydrates Solid inside Suspense to match the server, preserving slot elements, or renders for `client: "only"`. */
const hydrateComponent: UiHydrate<Component<Record<string, unknown>>> = (
	element,
	component,
	props,
	slots,
	{ id, render },
) => {
	const { default: children, ...named } = slots;
	const app = () =>
		createComponent(Suspense, {
			get children() {
				return createComponent(component, {
					...props,
					...named,
					...(children && { children }),
				});
			},
		});
	if (render) {
		renderInto(app, element);
		return;
	}
	hydrate(app, element, { renderId: id });
};

export default hydrateComponent;
