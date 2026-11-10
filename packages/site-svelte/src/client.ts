import type { UiHydrate } from "@lucidcms/site/ui";
import { type Component, hydrate, mount, unmount } from "svelte";
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
	const instance = render
		? mount(component, options)
		: hydrate(component, options);
	return () => void unmount(instance);
};

export default hydrateComponent;
