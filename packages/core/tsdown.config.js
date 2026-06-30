import { defineConfig } from "tsdown";
import packageJson from "./package.json" with { type: "json" };

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/types.ts",
		"src/build.ts",
		"src/plugin.ts",
		"src/toolkit.ts",
		"src/runtime.ts",
		"src/libs/cli/index.ts",
		"src/libs/queue/index.ts",
		"src/libs/db/index.ts",
		"src/libs/email/index.ts",
		"src/libs/image-processor/index.ts",
		"src/libs/kv/index.ts",
		"src/libs/media/index.ts",
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
	minify: true,
	platform: "node",
	unbundle: true,
});
