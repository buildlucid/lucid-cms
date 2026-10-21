import { defineUiIntegration, type UiFilter } from "@lucidcms/plugin-site/ui";

/** Renders Vue single-file components from the site's templates, for the site plugin's `ui` option. */
export const vue = (filter: UiFilter = {}) =>
	defineUiIntegration({
		name: "vue",
		extensions: [".vue"],
		...filter,
		vite: "@lucidcms/site-vue/vite",
		server: "@lucidcms/site-vue/server",
		client: "@lucidcms/site-vue/client",
	});
