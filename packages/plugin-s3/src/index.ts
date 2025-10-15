import type { Config } from "@lucidcms/core/types";
import plugin from "./plugin.js";
import type { PluginOptions } from "./types/types.js";

const lucidS3Plugin = (pluginOptions: PluginOptions) => (config: Config) =>
	plugin(config, pluginOptions);

export default lucidS3Plugin;
