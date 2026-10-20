import path from "node:path";
import { pluginDirectory } from "@lucidcms/core/extension";
import type { InlineConfig } from "vite";
import { ASSETS_BASE, PLUGIN_KEY } from "../../constants.js";

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
	cacheDir: path.join(pluginDirectory(PLUGIN_KEY, props.projectRoot), "vite"),
});

export default createViteOptions;
