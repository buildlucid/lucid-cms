import type { PreviewDocument, PreviewUpdateHandler } from "@lucidcms/types";

export type {
	PreviewDocument,
	PreviewUpdate,
	PreviewUpdateHandler,
} from "@lucidcms/types";

export type PreviewOptions = {
	/** The CMS's address, which serves the preview scripts. Defaults to the page's own origin, for sites the CMS serves. */
	host?: string | URL;
	/** Fetches the page again on each change in the builder and updates it in place, for server-rendered sites. Handlers registered with `onUpdate` run too. */
	morph?: boolean;
	/** The document the page shows, which signed-in editors get an Edit page link to. Previews link to the document they show without it. */
	document?: PreviewDocument | null;
	/** Shows Lucid's toolbar on previews and for signed-in editors. Defaults to true; turn it off to draw your own with `token` and `exit()`. */
	toolbar?: boolean;
	/** Navigates when a preview is exited, for sites whose router owns navigation. Defaults to loading the page again. */
	navigate?: (url: URL) => void | Promise<void>;
};

/** The page's preview: the builder's runtime in its preview frame, or the toolbar everywhere else. */
export type PreviewController = {
	/** Whether a Lucid runtime is running on the page. */
	readonly active: boolean;
	/** Resolves once the runtime's script has loaded, or failed to. */
	readonly ready: Promise<void>;
	/** The preview token to pass to Lucid reads, or null when the page isn't previewing. */
	readonly token: string | null;
	/**
	 * Re-renders the page when the builder's content changes instead of reloading it. Handlers run
	 * one update at a time and newer updates abort older ones. Returns a function that removes it.
	 */
	onUpdate: (handler: PreviewUpdateHandler) => () => void;
	/** Changes the document the page shows, eg. after a client-side navigation. */
	setDocument: (document: PreviewDocument | null) => void;
	/** Ends the preview and shows the published page. */
	exit: () => Promise<void>;
	/** Removes the runtime, its listeners and its UI. */
	cleanup: () => void;
};
