import { defineConfig } from "tsdown";

export default defineConfig({
    entry: [
        "src/index.ts",
        "src/types.ts",
        "src/builders.ts",
        "src/api.ts",
        "src/middleware.ts",
        "src/helpers.ts",
        "src/libs/cli/index.ts",
    ],
    dts: true,
    format: "esm",
    shims: false,
    sourcemap: true,
    clean: true,
    metafile: true,
});
