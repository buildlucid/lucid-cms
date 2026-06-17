import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/admin-bar.ts",
		"src/internal/runtime.ts",
		"src/internal/admin-bar.ts",
		"src/configure-lucid.ts",
		"src/toolkit.ts",
		"src/types.ts",
	],
	dts: true,
	format: "esm",
	shims: false,
	sourcemap: true,
	clean: true,
	metafile: true,
});
