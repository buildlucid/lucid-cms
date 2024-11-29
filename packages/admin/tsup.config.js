import { defineConfig } from "tsup";
import { solidPlugin } from "esbuild-plugin-solid";

const assetsPathPlugin = {
    name: 'assets-path',
    setup(build) {
        build.onResolve({ filter: /^.*\/assets\// }, args => {
            const assetPath = args.path.replace(/^.*\/assets\//, '../assets/');
            return {
                path: assetPath,
                external: true
            }
        })
    }
}

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    external: [],
    esbuildPlugins: [
        solidPlugin(),
        assetsPathPlugin
    ],
    treeshake: true,
    bundle: true,
    splitting: false
});