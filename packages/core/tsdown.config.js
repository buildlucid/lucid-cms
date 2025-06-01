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
    //* these are optional dependencies that are only required for the CLI and not when running on a server. The CLI will prompt the user to install them if they are not present.
    external: [
        "lightningcss",
        "@tailwindcss/oxide",
        "sharp",
        "chokidar",
        "commander",
        "jiti",
        "vite-plugin-solid",
        "rolldown",
        "@lucidcms/admin",
        "solid-js",
        "@tailwindcss/vite",
        "tailwindcss",
        "vite"
    ],
    dts: true,
    format: "esm",
    shims: false,
    sourcemap: true,
    clean: true,
    metafile: true,
});
