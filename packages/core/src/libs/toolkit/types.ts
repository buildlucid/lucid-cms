import type {
	CreateServiceContextOptions,
	ServiceContext,
} from "../../utils/services/types.js";
import type { ToolkitAuth } from "./auth/index.js";
import type { ToolkitDocuments } from "./documents/index.js";
import type { ToolkitEmail } from "./email/index.js";
import type { ToolkitLocales } from "./locales/index.js";
import type { ToolkitMedia } from "./media/index.js";
import type { ToolkitPreviews } from "./previews/index.js";

/** Lucid service context used by `createToolkit()`. */
export type ToolkitContext = ServiceContext;

/** Inputs for building a toolkit service context from resolved Lucid config. */
export type CreateToolkitServiceContextOptions = CreateServiceContextOptions;

export type ToolkitTenantOptions = {
	/** Overrides tenant scope for this toolkit call. A string scopes to that tenant plus global rows; null clears tenant scope. */
	tenantKey?: string | null;
};

export type Toolkit = {
	/** Helpers for resolving request authentication state. */
	auth: ToolkitAuth;
	/** Helpers for reading collection documents. */
	documents: ToolkitDocuments;
	/** Helpers for sending external emails. */
	email: ToolkitEmail;
	/** Helpers for reading enabled locales. */
	locales: ToolkitLocales;
	/** Helpers for reading and processing media. */
	media: ToolkitMedia;
	/** Helpers for resolving and handling previews. */
	previews: ToolkitPreviews;
};

export type * from "./auth/index.js";
export type * from "./auth/status.js";
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
export type * from "./previews/index.js";
export type * from "./previews/resolve.js";
export type * from "./previews/state.js";
