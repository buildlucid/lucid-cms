import plugin from "./plugin.js";

export { default as cloudflareImagesDeliveryAdapter } from "./adapter/index.js";
export { default as cloudflareImagesPlugin } from "./plugin.js";
export type {
	CloudflareImagesPluginOptions,
	CloudflareImagesPluginOptions as CloudflareImagesDeliveryAdapterOptions,
} from "./types.js";

export default plugin;
