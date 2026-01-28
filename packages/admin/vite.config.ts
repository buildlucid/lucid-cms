import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "rolldown-vite";
import devtools from "solid-devtools/vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
	build: {
		minify: true,
		outDir: "../core/spa",
		emptyOutDir: true,
	},
	plugins: [
		tailwindcss(),
		devtools({
			autoname: true,
		}),
		solidPlugin(),
	],
	base: "/lucid",
	server: {
		port: 3000,
	},
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"@types": fileURLToPath(new URL("../core/src/types.ts", import.meta.url)),
			"@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
		},
	},
});
