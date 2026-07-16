import type { DocumentVersionType, PreviewMode } from "@lucidcms/types";

export type PreviewModeSource = "explicit" | "url" | "stored";
export type PreviewKind = PreviewMode;

export type PreviewModeState = {
	active: boolean;
	token: string | null;
	source: PreviewModeSource | null;
	mode: PreviewKind | null;
};

export type ToolbarContextState = {
	/** True only inside an iframe explicitly named by Lucid's builder. */
	builder: boolean;
};

export type ToolbarEditLink = {
	collectionKey: string;
	documentId: number;
	status?: DocumentVersionType | null;
	versionId?: number | null;
	/** Defaults to `Edit page`. */
	label?: string;
};

export type ToolbarPreviewOptions = {
	/** Explicit preview token supplied by a server-rendered frontend. */
	token?: string | null;
	/** Server-resolved preview mode. Defaults to `perspective`. */
	mode?: PreviewKind;
	/** URL requested when preview ends. Defaults to the current page. */
	exitUrl?: string | URL;
	/** Optional additional cleanup before navigating with `preview=exit`. */
	onExit?: () => void | Promise<void>;
	/** Override same-origin token forwarding. It defaults to enabled for perspective previews. */
	propagateInternalLinks?: boolean;
	/** Remove the bearer token from the visible URL after activation. Perspective previews default to true outside a cross-origin iframe. */
	stripTokenFromUrl?: boolean;
};

export type ToolbarOptions = {
	/** Public host of the Lucid instance. Defaults to the current origin; values without a protocol use HTTPS. */
	host?: string | URL;
	/** Document metadata used to build the authenticated edit-page action. */
	edit?: ToolbarEditLink;
	/** Preview controls, or `false` when the server explicitly resolved published mode. */
	preview?: ToolbarPreviewOptions | false;
	/** Override the Lucid session-status check used for the edit action. */
	authentication?: boolean | (() => boolean | Promise<boolean>);
};

export type ToolbarController = {
	/** Whether the toolbar pill is currently visible. */
	readonly active: boolean;
	/** The toolbar host, or `null` when inactive or cleaned up. */
	readonly element: HTMLElement | null;
	/** The resolved preview state. */
	readonly preview: PreviewModeState;
	/** The resolved browser context. */
	readonly context: ToolbarContextState;
	/** Resolves after optional edit-action authentication has completed. */
	readonly ready: Promise<void>;
	/** Clears preview state and restores the published page. */
	exitPreview: () => Promise<void>;
	/** Removes the toolbar and its browser listeners. */
	cleanup: () => void;
};
