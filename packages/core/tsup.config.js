import { defineConfig } from "tsup";

export default defineConfig({
    entry: [
        "src/index.ts",
        "src/types.ts",
        "src/builders.ts",
        "src/api.ts",
        "src/middleware.ts",
    ],
    dts: true,
    format: "esm",
    shims: false,
    sourcemap: true,
    clean: true,
    metafile: true,
});
