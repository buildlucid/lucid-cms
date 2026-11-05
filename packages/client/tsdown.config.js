import { defineConfig } from "tsdown";

export default defineConfig([
	{
		dts: true,
		format: "esm",
		shims: false,
		sourcemap: true,
		metafile: true,
		minify: true,
		platform: "browser",
		target: "es2022",
		entry: ["src/index.ts", "src/types.ts", "src/contract.ts"],
		clean: true,
		unbundle: true,
	},
	{
		dts: true,
		format: "esm",
		shims: false,
		sourcemap: true,
		metafile: true,
		minify: true,
		platform: "browser",
		target: "es2022",
		entry: ["src/preview.ts"],
		clean: false,
		unbundle: false,
	},
]);
