import { defineConfig } from "tsdown";
import packageJson from "./package.json" with { type: "json" };

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/types.ts",
		"src/api.ts",
		"src/helpers.ts",
		"src/libs/cli/index.ts",
		"src/libs/queue-adapter/adapters/worker/consumer.ts",
	],
	external: [...Object.keys(packageJson.dependencies)],
	dts: true,
	format: "esm",
	shims: false,
	sourcemap: true,
	clean: true,
	metafile: true,
	minify: true,
	platform: "node",
});
