import { defineUiIntegration, type UiFilter } from "@lucidcms/plugin-site/ui";

/** Renders React components through the site's `ui` option with development Fast Refresh; set `include` alongside another JSX library, such as Solid. */
export const react = (filter: UiFilter = {}) =>
	defineUiIntegration({
		name: "react",
		extensions: [".jsx", ".tsx"],
		...filter,
		vite: "@lucidcms/site-react/vite",
		props: 'import("react").ComponentProps<typeof import($file).default>',
		server: "@lucidcms/site-react/server",
		client: "@lucidcms/site-react/client",
		// Fast Refresh's runtime, which plugin-react serves in development and leaves empty in builds.
		preamble: "@vitejs/plugin-react/preamble",
	});
