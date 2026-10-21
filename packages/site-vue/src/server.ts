import { defineUiRenderer } from "@lucidcms/plugin-site/ui";
import { type Component, createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { slotProps } from "./slots.js";

/** Renders a Vue component to HTML, waiting for its async setup. */
export default defineUiRenderer<Component>({
	render: (component, props, slots, { id }) => {
		const app = createSSRApp({
			render: () => {
				const parts = slotProps(props, slots);
				return h(component, parts.props, parts.slots);
			},
		});
		app.config.idPrefix = id;
		return renderToString(app);
	},
});
