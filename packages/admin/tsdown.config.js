import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: ["src/build/index.ts"],
		outDir: "dist/build",
		format: "esm",
		platform: "node",
		unbundle: true,
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
