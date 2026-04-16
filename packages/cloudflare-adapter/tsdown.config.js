import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts", "src/runtime-context.ts", "src/types.ts"],
    dts: true,
    format: "esm",
    shims: false,
    sourcemap: true,
    clean: true,
    metafile: true,
});
