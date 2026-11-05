import { defineConfig } from "tsdown";
import packageJson from "./package.json" with { type: "json" };

export default defineConfig({
	// Named entries keep the paths `package.json` exports.
	entry: {
		"exports/index": "src/exports/index.ts",
		"exports/types": "src/exports/types.ts",
		"exports/build": "src/exports/build.ts",
		"exports/extension": "src/exports/extension.ts",
		"exports/runtime": "src/exports/runtime.ts",
		"exports/toolkit": "src/exports/toolkit.ts",
		"exports/vite": "src/exports/vite.ts",
		"libs/cli/index": "src/libs/cli/index.ts",
	},
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
	// Bundle chunks to avoid thousands of development module loads. Stable names prevent stale watch output.
	hash: false,
	outputOptions: { chunkFileNames: "chunks/[name].mjs" },
	// The toolkit imports services on demand, some of which the rest of core imports statically.
	checks: { ineffectiveDynamicImport: false },
});
