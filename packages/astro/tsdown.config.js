import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/host.ts",
		"src/cli.ts",
		"src/internal/route.ts",
		"src/internal/middleware.ts",
		"src/toolkit.ts",
	],
	dts: true,
	format: "esm",
	shims: false,
	sourcemap: true,
	clean: true,
	metafile: true,
	// Lucid's Vite plugin serves `lucid:hosted` to the project's Vite app.
	external: [/^lucid:/],
});
