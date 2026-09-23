import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: ["src/index.ts"],
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
		entry: { components: "src/admin/components/index.ts" },
		outDir: "dist/admin",
		format: "esm",
		dts: { emitDtsOnly: true },
		clean: true,
	},
]);
