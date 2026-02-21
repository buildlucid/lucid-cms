import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/browser.ts", "src/server.ts"],
	dts: true,
	format: "esm",
	shims: false,
	sourcemap: true,
	clean: true,
	metafile: true,
});
