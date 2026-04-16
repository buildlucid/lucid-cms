import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/define-config.ts",
		"src/runtime.ts",
		"src/types.ts",
	],
	dts: true,
	format: "esm",
	shims: false,
	sourcemap: true,
	clean: true,
	metafile: true,
});
