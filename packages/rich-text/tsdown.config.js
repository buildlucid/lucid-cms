import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsdown";

const require = createRequire(import.meta.url);

export default defineConfig({
	entry: ["src/index.ts", "src/browser.ts", "src/server.ts"],
	dts: true,
	format: "esm",
	shims: false,
	sourcemap: true,
	clean: true,
	metafile: true,
	deps: {
		// Inlined so its stylesheet parser can be swapped out, see src/utils/no-stylesheets.ts.
		alwaysBundle: ["linkedom"],
		onlyBundle: false,
	},
	alias: {
		// linkedom tries the native canvas package before its own shim, so go straight to the shim.
		canvas: path.join(
			path.dirname(require.resolve("linkedom/package.json")),
			"commonjs/canvas-shim.cjs",
		),
		"@acemir/cssom": fileURLToPath(
			new URL("./src/utils/no-stylesheets.ts", import.meta.url),
		),
	},
});
