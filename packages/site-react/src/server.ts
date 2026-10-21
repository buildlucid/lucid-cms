import { defineUiRenderer } from "@lucidcms/plugin-site/ui";
import { type ComponentType, createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { slotProps } from "./slots.js";

/** Renders a React component to HTML, waiting for everything it suspends on. */
export default defineUiRenderer<ComponentType<Record<string, unknown>>>({
	render: async (component, props, slots, { id }) => {
		const parts = slotProps(props, slots);
		const stream = await renderToReadableStream(
			createElement(component, parts.props, parts.children),
			{ identifierPrefix: id },
		);
		await stream.allReady;
		return new Response(stream).text();
	},
});
