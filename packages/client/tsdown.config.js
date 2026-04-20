import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/types.ts"],
	dts: true,
	format: "esm",
	inlineOnly: false,
	shims: false,
	sourcemap: true,
	clean: true,
	metafile: true,
	minify: true,
	platform: "browser",
	target: "es2022",
});
