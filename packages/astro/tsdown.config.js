import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/host.ts",
		"src/cli.ts",
		"src/internal/create-astro-runtime.ts",
		"src/internal/route.ts",
		"src/internal/middleware.ts",
		"src/toolkit.ts",
		"src/types.ts",
	],
	dts: true,
	format: "esm",
	shims: false,
	sourcemap: true,
	clean: true,
	metafile: true,
	// Lucid's Astro integration serves the runtime module to the project's Vite app.
	external: [/^virtual:lucid\//],
});
