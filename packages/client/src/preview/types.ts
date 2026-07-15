export type PreviewMode = "perspective" | "exact";

export type PreviewController = {
	/** Whether the builder preview runtime is installed. */
	readonly active: boolean;
	/** Resolves after the builder preview runtime has loaded. */
	readonly ready: Promise<void>;
	/** Removes preview listeners and isolated UI. */
	cleanup: () => void;
};
