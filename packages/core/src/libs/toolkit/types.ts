import type { ToolkitDocuments } from "./documents/index.js";
import type { ToolkitLocales } from "./locales/index.js";
import type { ToolkitMedia } from "./media/index.js";

export type CreateToolkitOptions = {
	/**
	 * Request URL to use when Lucid needs to build absolute URLs.
	 * If omitted, Lucid uses `config.baseUrl`, then falls back to `http://localhost:6543`.
	 */
	requestUrl?: string;
};

export type Toolkit = {
	/** Helpers for reading collection documents. */
	documents: ToolkitDocuments;
	/** Helpers for reading enabled locales. */
	locales: ToolkitLocales;
	/** Helpers for reading and processing media. */
	media: ToolkitMedia;
};

export type * from "./documents/get-multiple.js";
export type * from "./documents/get-single.js";
export type * from "./documents/index.js";
export type * from "./locales/get-all.js";
export type * from "./locales/index.js";
export type * from "./media/get-multiple.js";
export type * from "./media/get-single.js";
export type * from "./media/index.js";
export type * from "./media/process-media.js";
