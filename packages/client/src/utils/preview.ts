export const previewQueryParam = "preview";
export const previewContextQueryParam = "previewContext";
export const builderPreviewContext = "builder";

type BuilderPreviewMode = "perspective" | "scoped";

const builderPreviewFrameNames = {
	perspective: "lucid-builder-preview:perspective",
	scoped: "lucid-builder-preview:scoped",
} as const satisfies Record<BuilderPreviewMode, string>;

const previewTokenPattern = /^[A-Za-z0-9_-]{43}$/;

/** Returns the browser window, or `null` during SSR. */
export const getWindow = (): Window | null =>
	typeof window === "undefined" ? null : window;

/** Returns a valid preview token, or `null`. */
export const normalizePreviewToken = (
	value: string | null | undefined,
): string | null => (value && previewTokenPattern.test(value) ? value : null);

const isEmbedded = (targetWindow: Window): boolean => {
	try {
		return targetWindow.self !== targetWindow.top;
	} catch {
		return true;
	}
};

/** Resolves the mode of an iframe explicitly named by Lucid's builder. */
export const getBuilderPreviewMode = (
	targetWindow: Window,
): BuilderPreviewMode | null => {
	if (!isEmbedded(targetWindow)) return null;

	switch (targetWindow.name) {
		case builderPreviewFrameNames.perspective:
			return "perspective";
		case builderPreviewFrameNames.scoped:
			return "scoped";
		default:
			return null;
	}
};

/** Detects the iframe explicitly named by Lucid's builder. */
export const isLucidBuilderPreview = (targetWindow: Window): boolean =>
	getBuilderPreviewMode(targetWindow) !== null;
