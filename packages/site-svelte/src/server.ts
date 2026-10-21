import { clientSlot, defineUiRenderer } from "@lucidcms/plugin-site/ui";
import type { Component } from "svelte";
import { render } from "svelte/server";
import { slotProps } from "./slots.js";

/** Renders a Svelte component to HTML, waiting for its async work, with what `<svelte:head>` adds. */
export default defineUiRenderer<Component<Record<string, unknown>>>({
	render: async (component, props, slots, { id }) => {
		const { body, head } = await render(component, {
			props: slotProps(
				props,
				Object.fromEntries(
					Object.entries(slots).map(([name, html]) => [
						name,
						clientSlot(name, html),
					]),
				),
			),
			idPrefix: id,
		});
		return { html: body, head };
	},
});
