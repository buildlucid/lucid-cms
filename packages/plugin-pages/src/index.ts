import type { Config } from "@lucidcms/core/types";
import type { PluginOptions } from "./types/types.js";
import plugin from "./plugin.js";

const lucidPagesPlugin = (pluginOptions: PluginOptions) => (config: Config) =>
	plugin(config, pluginOptions);

export default lucidPagesPlugin;
