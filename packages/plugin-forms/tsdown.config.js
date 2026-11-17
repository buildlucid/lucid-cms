import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: { index: "src/index.ts", site: "src/site.ts" },
		outDir: "dist/server",
		dts: true,
		format: "esm",
		shims: false,
		sourcemap: true,
		clean: true,
		metafile: true,
		deps: { onlyBundle: false },
	},
	{
		entry: { index: "src/browser.ts" },
		outDir: "dist/browser",
		dts: true,
		format: "esm",
		sourcemap: true,
		clean: true,
	},
	{
		entry: { components: "src/admin/components/index.ts" },
		outDir: "dist/admin",
		format: "esm",
		dts: { emitDtsOnly: true },
		clean: true,
	},
]);
