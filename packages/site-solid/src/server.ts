import { clientSlot, defineUiRenderer } from "@lucidcms/plugin-site/ui";
import type { Component } from "solid-js";
import {
	createComponent,
	NoHydration,
	renderToStringAsync,
	ssr,
} from "solid-js/web";

const slot = (name: string, html: string) => ssr(clientSlot(name, html));

/** Renders Solid to HTML after its resources resolve, adding hydration keys only for components that hydrate. */
export default defineUiRenderer<Component<Record<string, unknown>>>({
	render: (component, props, slots, { id, hydrate }) => {
		const { default: children, ...named } = slots;
		const app = () =>
			createComponent(component, {
				...props,
				...Object.fromEntries(
					Object.entries(named).map(([name, html]) => [name, slot(name, html)]),
				),
				...(children !== undefined && { children: slot("default", children) }),
			});
		return renderToStringAsync(
			hydrate
				? app
				: () =>
						createComponent(NoHydration, {
							get children() {
								return app();
							},
						}),
			{ renderId: id },
		);
	},
});
