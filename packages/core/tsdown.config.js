import { defineConfig } from "tsdown";
import packageJson from "./package.json" with { type: "json" };

export default defineConfig({
	entry: [
		"src/exports/index.ts",
		"src/exports/types.ts",
		"src/exports/build.ts",
		"src/exports/extension.ts",
		"src/exports/runtime.ts",
		"src/libs/cli/index.ts",
	],
	deps: {
		neverBundle: [...Object.keys(packageJson.dependencies)],
		onlyBundle: false,
	},
	dts: true,
	format: "esm",
	shims: false,
	sourcemap: true,
	clean: true,
	metafile: true,
	minify: {
		codegen: {
			legalComments: "inline",
		},
	},
	platform: "node",
	unbundle: true,
});
