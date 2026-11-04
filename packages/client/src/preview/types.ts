import type { PreviewUpdateHandler } from "@lucidcms/types";

export type { PreviewUpdate, PreviewUpdateHandler } from "@lucidcms/types";

export type PreviewOptions = {
	/** The CMS's address, which serves the preview script. Defaults to the page's own origin, for sites the CMS serves. */
	host?: string | URL;
	/** Fetches the page again on each change and updates it in place, for server-rendered sites. Handlers registered with `onUpdate` run too. */
	morph?: boolean;
};

/** Preview runtime lifecycle. Await ready before relying on installed listeners; call cleanup when disposing the page. */
export type PreviewController = {
	/** Whether the builder preview runtime is running. */
	readonly active: boolean;
	/** Resolves once the preview script has loaded, or failed to. */
	readonly ready: Promise<void>;
	/** The preview token from the page URL, to pass to Lucid reads. Null outside the builder preview. */
	readonly token: string | null;
	/**
	 * Re-renders the page when its content changes instead of reloading it.
	 * Handlers run one update at a time and newer updates abort older ones.
	 * Returns a function that removes the handler.
	 */
	onUpdate: (handler: PreviewUpdateHandler) => () => void;
	/** Removes preview listeners, update handlers and isolated UI. */
	cleanup: () => void;
};
