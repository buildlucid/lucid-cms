export type { PreviewMode } from "@lucidcms/types";

export type PreviewController = {
	/** Whether the builder preview runtime is installed. */
	readonly active: boolean;
	/** Resolves after the builder preview runtime has loaded. */
	readonly ready: Promise<void>;
	/** Removes preview listeners and isolated UI. */
	cleanup: () => void;
};
