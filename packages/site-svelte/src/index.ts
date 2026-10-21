import { defineUiIntegration, type UiFilter } from "@lucidcms/plugin-site/ui";

/** Renders Svelte 5 components from the site's templates, for the site plugin's `ui` option. */
export const svelte = (filter: UiFilter = {}) =>
	defineUiIntegration({
		name: "svelte",
		extensions: [".svelte"],
		...filter,
		vite: "@lucidcms/site-svelte/vite",
		server: "@lucidcms/site-svelte/server",
		client: "@lucidcms/site-svelte/client",
	});
