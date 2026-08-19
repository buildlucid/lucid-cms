import plugin from "./plugin.js";

export type { FileSystemStorageAdapterOptions } from "@lucidcms/core/types";
export { default as filesystemStorageAdapter } from "./adapter/index.js";
export { default as filesystemPlugin } from "./plugin.js";
export type { PluginOptions as FilesystemPluginOptions } from "./types.js";

export default plugin;
