import type { UiHydrate } from "@lucidcms/plugin-site/ui";
import { type Component, createApp, createSSRApp, h } from "vue";
import { slotProps } from "./slots.js";

/** Hydrates a Vue component the server rendered, or renders one for `client: "only"`, with its slots' HTML. */
const hydrateComponent: UiHydrate<Component> = (
	element,
	component,
	props,
	slots,
	{ id, render },
) => {
	const html = Object.fromEntries(
		Object.entries(slots).map(([name, slot]) => [name, slot.innerHTML]),
	);
	const app = (render ? createApp : createSSRApp)({
		render: () => {
			const parts = slotProps(props, html);
			return h(component, parts.props, parts.slots);
		},
	});
	app.config.idPrefix = id;
	app.mount(element);
};

export default hydrateComponent;
