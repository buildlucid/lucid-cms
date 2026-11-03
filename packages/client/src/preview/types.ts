export type { PreviewMode } from "@lucidcms/types";

/** A change to the previewed content: unsaved edits in the builder, or a save. */
export type PreviewUpdate = {
	/** Rises with every change within one preview. */
	readonly revision: number;
	/** Aborts when a newer update replaces this one. Pass it to fetches. */
	readonly signal: AbortSignal;
};

/** Re-reads the page's Lucid content and re-renders it. Throwing or rejecting reloads the page instead. */
export type PreviewUpdateHandler = (
	update: PreviewUpdate,
) => void | Promise<void>;

/** Preview runtime lifecycle. Await ready before relying on installed listeners; call cleanup when disposing the page. */
export type PreviewController = {
	/** Whether the builder preview runtime is installed. */
	readonly active: boolean;
	/** Resolves after the builder preview runtime has loaded. */
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
