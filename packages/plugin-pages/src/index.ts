import plugin from "./plugin.js";

export type { PagesAfterRebuildPathsHookData } from "./hook-events/index.js";
export { default as pagesPlugin } from "./plugin.js";
export type { PagesGetByPathInput } from "./toolkit/get-by-path/index.js";
export type { PagesToolkit } from "./toolkit/index.js";

export default plugin;
