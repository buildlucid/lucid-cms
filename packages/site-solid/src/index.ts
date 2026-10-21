import { defineUiIntegration, type UiFilter } from "@lucidcms/plugin-site/ui";

/** Renders Solid components through the site's `ui` option; set `include` alongside another JSX library, such as React. */
export const solid = (filter: UiFilter = {}) =>
	defineUiIntegration({
		name: "solid",
		extensions: [".jsx", ".tsx"],
		...filter,
		vite: "@lucidcms/site-solid/vite",
		// Solid components are plain functions, and this reads their props whichever JSX settings check it.
		props: "Parameters<typeof import($file).default>[0]",
		server: "@lucidcms/site-solid/server",
		client: "@lucidcms/site-solid/client",
	});
