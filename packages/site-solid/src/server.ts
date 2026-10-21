import { clientSlot, defineUiRenderer } from "@lucidcms/plugin-site/ui";
import { type Component, Suspense } from "solid-js";
import {
	createComponent,
	generateHydrationScript,
	NoHydration,
	renderToStringAsync,
	ssr,
} from "solid-js/web";

const slot = (name: string, html: string) => ssr(clientSlot(name, html));

/** Renders Solid after resources resolve, emitting hydration keys and a script before serialised data only for hydrated components; repeated scripts initialise state once per page. */
export default defineUiRenderer<Component<Record<string, unknown>>>({
	render: async (component, props, slots, { id, hydrate }) => {
		const { default: children, ...named } = slots;
		const app = () =>
			createComponent(component, {
				...props,
				...Object.fromEntries(
					Object.entries(named).map(([name, html]) => [name, slot(name, html)]),
				),
				...(children !== undefined && { children: slot("default", children) }),
			});
		// Pass `noScripts` through a variable because Solid supports it without declaring its type, omitting resource scripts for server-only components.
		const options = { renderId: id, noScripts: !hydrate };
		// Suspense makes the render wait for resources; the client wraps components the same way to match.
		const html = await renderToStringAsync(
			() =>
				createComponent(Suspense, {
					get children() {
						return hydrate
							? app()
							: createComponent(NoHydration, {
									get children() {
										return app();
									},
								});
					},
				}),
			options,
		);
		return hydrate ? generateHydrationScript() + html : html;
	},
});
