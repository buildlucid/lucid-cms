import type { ServiceContext } from "../../utils/services/types.js";
import type { ToolkitAuth } from "./auth/index.js";
import type { ToolkitDocuments } from "./documents/index.js";
import type { ToolkitEmail } from "./email/index.js";
import type { ToolkitJobs } from "./jobs/index.js";
import type { ToolkitLocales } from "./locales/index.js";
import type { ToolkitMedia } from "./media/index.js";
import type { ToolkitPreviews } from "./previews/index.js";

/** Lucid service context used by `createToolkit()`. */
export type ToolkitContext = ServiceContext;

/** Server-side helpers bound to a Lucid service context. */
export type Toolkit = {
	/** Helpers for resolving request authentication state. */
	auth: ToolkitAuth;
	/** Helpers for reading collection documents. */
	documents: ToolkitDocuments;
	/** Helpers for sending external emails. */
	email: ToolkitEmail;
	/** Helpers for enqueueing and cancelling durable jobs. */
	jobs: ToolkitJobs;
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
export type * from "./jobs/index.js";
export type * from "./locales/get-all.js";
export type * from "./locales/index.js";
export type * from "./media/get-multiple.js";
export type * from "./media/get-single.js";
export type * from "./media/index.js";
export type * from "./media/resolve-url.js";
export type * from "./previews/index.js";
export type * from "./previews/resolve.js";
export type * from "./previews/state.js";
