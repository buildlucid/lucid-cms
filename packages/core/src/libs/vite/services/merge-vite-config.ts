import merge from "lodash.merge";
import tailwindcss from "@tailwindcss/vite";
import solidPlugin from "vite-plugin-solid";
import type { VitePaths } from "./get-paths.js";
import type { InlineConfig } from "vite";
import type { Config } from "../../../types.js";

const mergeViteConfig = (config: Config, paths: VitePaths) => {
	return merge(
		{
			plugins: [tailwindcss(), solidPlugin()],
			root: paths.publicDist,
			build: {
				outDir: paths.clientDist,
				emptyOutDir: true,
				rollupOptions: {
					input: paths.clientHtml,
				},
			},
			base: "/admin",
			logLevel: "silent",
		},
		config.compilerOptions?.vite,
	) as InlineConfig;
};

export default mergeViteConfig;
