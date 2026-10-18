import path from "node:path";
import type { InlineConfig } from "vite";
import { ASSETS_BASE, VITE_CACHE_DIRECTORY } from "../../constants.js";

/** Settings shared by the dev server and the build. Vite still loads `vite.config.*` from the site directory for plugins. */
const createViteOptions = (props: {
	root: string;
	projectRoot: string;
}): InlineConfig => ({
	root: props.root,
	base: ASSETS_BASE,
	publicDir: false,
	envDir: false,
	clearScreen: false,
	cacheDir: path.resolve(props.projectRoot, VITE_CACHE_DIRECTORY),
});

export default createViteOptions;
