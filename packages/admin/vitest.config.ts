import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import devtools from "solid-devtools/vite";
import solidPlugin from "vite-plugin-solid";
import { defineConfig } from "vitest/config";
import { adminClientConfigPlugin } from "./src/build/client-config.js";
import { adminExtensionsPlugin } from "./src/build/extensions/plugin.js";

export default defineConfig({
	test: {
		name: "@lucidcms/admin",
		environment: "happy-dom",
		server: {
			deps: {
				inline: [
					/solid-js/,
					/@solidjs/,
					/@tanstack\/solid-query/,
					/@kobalte\/core/,
					/solid-toast/,
				],
			},
		},
	},
	optimizeDeps: {
		include: ["@codemirror/state", "@codemirror/view"],
	},
	plugins: [
		adminClientConfigPlugin({ brand: { name: "Lucid test" } }),
		adminExtensionsPlugin({
			configPath: fileURLToPath(import.meta.url),
			stylesheetPath: fileURLToPath(
				new URL("./src/index.css", import.meta.url),
			),
		}),
		tailwindcss(),
		devtools({
			autoname: true,
		}),
		solidPlugin(),
	],
	resolve: {
		dedupe: ["solid-js", "@solidjs/router", "@tanstack/solid-query"],
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"@types": fileURLToPath(
				new URL("../core/src/exports/types.ts", import.meta.url),
			),
			"@field-conditions": fileURLToPath(
				new URL(
					"../core/src/libs/collection/custom-fields/conditions/index.ts",
					import.meta.url,
				),
			),
			"@field-capabilities": fileURLToPath(
				new URL(
					"../core/src/libs/collection/custom-fields/capabilities.ts",
					import.meta.url,
				),
			),
			"@match-permissions": fileURLToPath(
				new URL(
					"../core/src/libs/permission/match-permissions.ts",
					import.meta.url,
				),
			),
			"@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
		},
	},
});
