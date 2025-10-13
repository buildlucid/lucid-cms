import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "rolldown-vite";
import solidPlugin from "vite-plugin-solid";
import devtools from "solid-devtools/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	build: {
		minify: true,
		outDir: "../core/admin",
		emptyOutDir: true,
	},
	plugins: [
		tailwindcss(),
		devtools({
			autoname: true,
		}),
		solidPlugin(),
	],
	base: "/admin",
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
