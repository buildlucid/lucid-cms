import plugin from "./plugin.js";

export { default as cloudflareR2StorageAdapter } from "./adapter.js";
export { default as cloudflareR2Plugin } from "./plugin.js";
export type {
	HttpOptions as CloudflareR2HttpOptions,
	PluginOptions as CloudflareR2PluginOptions,
	PluginOptions as CloudflareR2StorageAdapterOptions,
} from "./types.js";

export default plugin;
