import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/entry.ts",
		"src/vite.ts",
		"src/config.ts",
		"src/astro.ts",
		"src/astro-integration.ts",
		"src/types.ts",
	],
	dts: true,
	format: "esm",
	shims: false,
	sourcemap: true,
	clean: true,
	metafile: true,
	deps: {
		// The Astro bridges only check their types against Lucid's Astro integration, which is what loads them.
		neverBundle: [/^@lucidcms\/astro\//],
	},
});
