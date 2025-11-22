import { defineConfig } from "tsdown";
import packageJson from "./package.json" with { type: "json" };

export default defineConfig({
    entry: [
        "src/index.ts",
        "src/types.ts",
        "src/api.ts",
        "src/helpers.ts",
        "src/libs/cli/index.ts",
        "src/libs/queue-adapter/index.ts",
        "src/libs/queue-adapter/adapters/worker/consumer.ts",
        "src/libs/builders/index.ts",
        "src/libs/db-adapter/index.ts",
        "src/libs/email-adapter/index.ts",
        "src/libs/image-processor/index.ts",
        "src/libs/kv-adapter/index.ts",
        "src/libs/media-adapter/index.ts",
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
    unbundle: true,
});
