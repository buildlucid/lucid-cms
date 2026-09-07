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

/** Core server-side helpers provided by Lucid. */
export type CoreToolkit = {
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
	/** Helpers for uploading, updating, reading and deleting media. */
	media: ToolkitMedia;
	/** Helpers for resolving and handling previews. */
	previews: ToolkitPreviews;
};

/**
 * Toolkit services registered by plugins.
 *
 * Plugins extend this interface through module augmentation to describe their
 * services. A service is only available when its plugin is configured.
 */
// biome-ignore lint/suspicious/noEmptyInterface: plugins merge their services into this interface
export interface ToolkitServices {}

/** Core helpers and any configured plugin services bound to a service context. */
export type Toolkit = CoreToolkit & Partial<ToolkitServices>;

/** A named service factory registered by a plugin. */
export type ToolkitDefinitionInput<
	TKey extends string = string,
	TService extends object = object,
> = {
	/** Unique toolkit namespace. Declare the same key in ToolkitServices for typed access. */
	readonly key: TKey;
	/** Create a service synchronously from the current context and core helpers. Async methods on the returned service are supported. */
	readonly create: (props: {
		context: ToolkitContext;
		core: CoreToolkit;
	}) => TService & { then?: never };
};

/** A toolkit extension returned by defineToolkit. */
export type ToolkitDefinition<
	TKey extends string = string,
	TService extends object = object,
> = ToolkitDefinitionInput<TKey, TService> & {
	readonly type: "toolkit-definition";
};

export type * from "./auth/index.js";
export type * from "./auth/status/index.js";
export type * from "./documents/get-multiple/index.js";
export type * from "./documents/get-single/index.js";
export type * from "./documents/index.js";
export type * from "./email/index.js";
export type * from "./email/send/index.js";
export type * from "./jobs/index.js";
export type * from "./locales/get-all/index.js";
export type * from "./locales/index.js";
export type * from "./media/delete-single/index.js";
export type * from "./media/get-multiple/index.js";
export type * from "./media/get-single/index.js";
export type * from "./media/index.js";
export type * from "./media/replace-file/index.js";
export type * from "./media/request-download/index.js";
export type * from "./media/resolve-url/index.js";
export type * from "./media/stream/index.js";
export type * from "./media/update-single/index.js";
export type * from "./media/upload-file/index.js";
export type * from "./previews/index.js";
export type * from "./previews/resolve/index.js";
export type * from "./previews/state/index.js";
