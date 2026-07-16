import { defineConfig } from "tsdown";

export default defineConfig([
	{
		dts: true,
		format: "esm",
		deps: {
			alwaysBundle: ["@lucidcms/preview-protocol"],
		},
		shims: false,
		sourcemap: true,
		metafile: true,
		minify: true,
		platform: "browser",
		target: "es2022",
		entry: ["src/index.ts", "src/types.ts"],
		clean: true,
		unbundle: true,
	},
	{
		dts: true,
		format: "esm",
		deps: {
			onlyBundle: false,
		},
		shims: false,
		sourcemap: true,
		metafile: true,
		minify: true,
		platform: "browser",
		target: "es2022",
		entry: ["src/toolbar.ts"],
		clean: false,
		unbundle: false,
	},
	{
		dts: true,
		format: "esm",
		deps: {
			alwaysBundle: ["@lucidcms/preview-protocol"],
		},
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
