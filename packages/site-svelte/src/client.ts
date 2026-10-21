import type { UiHydrate } from "@lucidcms/plugin-site/ui";
import { type Component, hydrate, mount } from "svelte";
import { slotProps } from "./slots.js";

/** Hydrates Svelte with slot HTML and IDs restored from server markup via `$props.id()`, or mounts for `client: "only"`. */
const hydrateComponent: UiHydrate<Component<Record<string, unknown>>> = (
	element,
	component,
	props,
	slots,
	{ render },
) => {
	const options = {
		target: element,
		props: slotProps(
			props,
			Object.fromEntries(
				Object.entries(slots).map(([name, slot]) => [name, slot.outerHTML]),
			),
		),
	};
	if (render) mount(component, options);
	else hydrate(component, options);
};

export default hydrateComponent;
