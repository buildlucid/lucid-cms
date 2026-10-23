import { existsSync } from "node:fs";
import path from "node:path";
import { defineUiVite } from "@lucidcms/plugin-site/ui";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const svelteConfigFiles = [
	"svelte.config.js",
	"svelte.config.mjs",
	"svelte.config.cjs",
	"svelte.config.ts",
	"svelte.config.mts",
];

/** Compiles server and browser components with vite-plugin-svelte, reading `svelte.config.*` when present and skipping lookup otherwise. */
export default defineUiVite((files, { projectRoot }) => [
	svelte({
		...files,
		configFile: svelteConfigFiles.some((file) =>
			existsSync(path.join(projectRoot, file)),
		)
			? undefined
			: false,
	}),
]);
