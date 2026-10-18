import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: { index: "src/index.ts", cli: "src/cli/index.ts" },
		dts: true,
		format: "esm",
		shims: false,
		sourcemap: true,
		clean: true,
		metafile: true,
		deps: {
			onlyBundle: false,
		},
	},
	{
		entry: { "client/lucid": "src/client/lucid.ts" },
		dts: false,
		format: "esm",
		platform: "browser",
		target: "es2022",
		minify: true,
		shims: false,
		clean: false,
		deps: {
			alwaysBundle: ["@lucidcms/client/bootstrap"],
		},
		outputOptions: { codeSplitting: false },
	},
]);
