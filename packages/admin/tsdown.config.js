import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: {
			components: "src/exports/components.ts",
			hooks: "src/exports/hooks.ts",
			services: "src/exports/services.ts",
			utils: "src/exports/utils.ts",
		},
		outDir: "dist/browser",
		format: "esm",
		dts: { emitDtsOnly: true },
		clean: true,
	},
	{
		entry: { types: "src/exports/types.ts" },
		outDir: "dist/types",
		dts: { emitDtsOnly: true },
		format: "esm",
		clean: true,
	},
	{
		entry: { index: "src/exports/build.ts" },
		outDir: "dist/build",
		format: "esm",
		platform: "node",
		unbundle: true,
		dts: true,
		clean: true,
	},
	{
		entry: { slots: "src/exports/slots.ts" },
		outDir: "dist/slots",
		format: "esm",
		dts: true,
		clean: true,
	},
	{
		entry: {
			conditions:
				"../core/src/libs/collection/custom-fields/conditions/index.ts",
			capabilities: "../core/src/libs/collection/custom-fields/capabilities.ts",
			preview: "../preview-protocol/src/index.ts",
		},
		outDir: "dist/shared",
		format: "esm",
		platform: "browser",
		dts: false,
		clean: true,
	},
]);
