import type { KVAdapterInstance } from "../../libs/kv/types.js";
import type { QueueAdapterInstance } from "../../libs/queue/types.js";
import type { EnvironmentVariables } from "../../libs/runtime/types.js";
import type { Config } from "../../types/config.js";
import type { ServiceContext } from "../../utils/services/types.js";
import type { ToolkitDocuments } from "./documents/index.js";
import type { ToolkitEmail } from "./email/index.js";
import type { ToolkitLocales } from "./locales/index.js";
import type { ToolkitMedia } from "./media/index.js";

/** Lucid service context used by `createToolkit()`. */
export type ToolkitContext = ServiceContext;

/** Inputs for building a toolkit service context from resolved Lucid config. */
export type CreateToolkitServiceContextOptions = {
	/** Resolved Lucid config to build the toolkit from. */
	config: Config;
	/** Optional runtime env bindings associated with the config. */
	env?: EnvironmentVariables | null;
	/** Optional queue adapter instance to use for toolkit-backed services. */
	queue?: QueueAdapterInstance;
	/** Optional KV adapter instance to use for toolkit-backed services. */
	kv?: KVAdapterInstance;
	/**
	 * Request URL to use when Lucid needs to build absolute URLs.
	 * If omitted, Lucid uses `config.baseUrl`, then falls back to `http://localhost:6543`.
	 */
	request?: {
		url?: string;
		ipAddress?: string | null;
	};
};

export type Toolkit = {
	/** Helpers for reading collection documents. */
	documents: ToolkitDocuments;
	/** Helpers for sending external emails. */
	email: ToolkitEmail;
	/** Helpers for reading enabled locales. */
	locales: ToolkitLocales;
	/** Helpers for reading and processing media. */
	media: ToolkitMedia;
};

export type * from "./documents/get-multiple.js";
export type * from "./documents/get-single.js";
export type * from "./documents/index.js";
export type * from "./email/index.js";
export type * from "./email/send.js";
export type * from "./locales/get-all.js";
export type * from "./locales/index.js";
export type * from "./media/get-multiple.js";
export type * from "./media/get-single.js";
export type * from "./media/index.js";
export type * from "./media/process-media.js";
