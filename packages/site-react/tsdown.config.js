import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: ["src/index.ts"],
		dts: true,
		format: "esm",
		shims: false,
		sourcemap: true,
		clean: true,
		deps: {
			onlyBundle: false,
		},
	},
	// The renderer, hydration module and Vite plugins each stand alone, so each loads only what it imports.
	...["server", "client", "vite"].map((entry) => ({
		entry: { [entry]: `src/${entry}.ts` },
		dts: false,
		format: "esm",
		shims: false,
		clean: false,
		outputOptions: { codeSplitting: false },
	})),
]);
