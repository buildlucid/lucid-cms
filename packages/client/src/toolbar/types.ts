import type { CollectionDocument, PreviewRuntimeState } from "@lucidcms/types";

type MaybePromise<T> = T | Promise<T>;

export type ToolbarDocument = Pick<
	CollectionDocument,
	"collectionKey" | "id" | "version"
> & {
	meta?: Pick<NonNullable<CollectionDocument["meta"]>, "versionId">;
};

export type ToolbarAuthentication =
	| "auto"
	| boolean
	| (() => MaybePromise<boolean>);

export type ToolbarPreviewNavigation = {
	/** URL requested when preview ends. Defaults to the current page. */
	exitUrl?: string | URL;
	/** Optional additional cleanup before preview exit navigation. */
	onExit?: () => MaybePromise<void>;
	/** Replaces full-page navigation when an application router owns navigation. */
	navigate?: (url: URL) => MaybePromise<void>;
	/** Override same-origin token forwarding for perspective previews. */
	propagateInternalLinks?: boolean;
	/** Override removal of a resolved perspective token from the visible URL. */
	stripTokenFromUrl?: boolean;
};

export type ToolbarError = {
	kind: "authentication" | "preview" | "runtime";
	cause: unknown;
};

export type ToolbarOptions = {
	/** Public host of the Lucid instance. Defaults to the current origin. */
	host?: string | URL;
	/** Initial document metadata used to build the edit-page action. */
	document?: ToolbarDocument | null;
	/** Defaults to `Edit page`. */
	editLabel?: string;
	/** Defaults to `auto`. */
	authentication?: ToolbarAuthentication;
	/** Defaults to `auto`. */
	preview?: "auto" | PreviewRuntimeState;
	previewNavigation?: ToolbarPreviewNavigation;
	/** Reports resolution failures without breaking the host application. */
	onError?: (error: ToolbarError) => void;
};

export type ToolbarUpdate = {
	/** Complete route document state. `null` clears the previous edit action. */
	document: ToolbarDocument | null;
	/** Route URL used by automatic preview resolution. Defaults to the current URL. */
	url?: string | URL;
	/** Replaces the configured preview policy for this and later updates. */
	preview?: "auto" | PreviewRuntimeState;
	/** Replaces the configured edit label for this and later updates. */
	editLabel?: string;
};

export type ToolbarController = {
	/** Whether the toolbar pill is currently visible. */
	readonly active: boolean;
	/** The latest resolved preview state. */
	readonly preview: PreviewRuntimeState;
	/** Resolves after the initial browser state has settled. */
	readonly ready: Promise<void>;
	/** Atomically applies route-owned state. The latest update wins. */
	update: (update: ToolbarUpdate) => Promise<void>;
	/** Clears preview state and restores the published page. */
	exitPreview: () => Promise<void>;
	/** Removes the toolbar and its browser listeners. */
	cleanup: () => void;
};
