import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: {
			index: "src/index.ts",
			cli: "src/cli/index.ts",
			ui: "src/ui/index.ts",
		},
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
		entry: { components: "src/admin/components/index.ts" },
		outDir: "dist/admin",
		format: "esm",
		dts: { emitDtsOnly: true },
		clean: true,
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
			alwaysBundle: ["@lucidcms/client/preview", "@lucidcms/client/toolbar"],
		},
		outputOptions: { codeSplitting: false },
	},
	{
		entry: { "client/component": "src/client/component.ts" },
		dts: false,
		format: "esm",
		platform: "browser",
		target: "es2022",
		minify: true,
		shims: false,
		clean: false,
		outputOptions: { codeSplitting: false },
	},
]);
