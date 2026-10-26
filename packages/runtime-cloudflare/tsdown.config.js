import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/entry.ts",
		"src/vite.ts",
		"src/config.ts",
		"src/hosted.ts",
		"src/types.ts",
	],
	dts: true,
	format: "esm",
	shims: false,
	sourcemap: true,
	clean: true,
	metafile: true,
	deps: {
		// Workers provide `cloudflare:workers` at runtime.
		neverBundle: ["cloudflare:workers"],
	},
});
