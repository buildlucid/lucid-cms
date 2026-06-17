import plugin from "./plugin.js";

export type { WorkerQueueAdapterOptions } from "./adapter/index.js";
export { default as workerQueueAdapter } from "./adapter/index.js";
export { default as workerQueuePlugin } from "./plugin.js";

export default plugin;
