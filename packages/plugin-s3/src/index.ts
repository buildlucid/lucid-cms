import plugin from "./plugin.js";

export { default as s3StorageAdapter } from "./adapter.js";
export { default as s3Plugin } from "./plugin.js";
export type {
	PluginOptions as S3PluginOptions,
	PluginOptions as S3StorageAdapterOptions,
} from "./types/types.js";

export default plugin;
