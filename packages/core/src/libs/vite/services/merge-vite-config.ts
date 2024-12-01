import merge from "lodash.merge";
import tailwindcss from "@tailwindcss/vite";
import solidPlugin from "vite-plugin-solid";
import getPaths from "./get-paths.js";
import type { InlineConfig } from "vite";
import type { Config } from "../../../types.js";

const mergeViteConfig = (config: Config) => {
	const paths = getPaths();
	return merge(
		{
			plugins: [tailwindcss(), solidPlugin()],
			root: paths.clientDirectory,
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
		config.vite,
	) as InlineConfig;
};

export default mergeViteConfig;
