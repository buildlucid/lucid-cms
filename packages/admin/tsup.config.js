import { defineConfig } from "tsup";
import { solidPlugin } from "esbuild-plugin-solid";

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    external: [],
    esbuildPlugins: [
        solidPlugin(),
    ],
    treeshake: true,
    bundle: true,
    splitting: false
});