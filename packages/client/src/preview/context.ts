import { normalizePreviewToken, previewQueryParam } from "../utils/preview.js";

/** Reads the preview token owned by the current URL. */
export const resolvePreviewToken = (targetWindow: Window): string | null =>
	normalizePreviewToken(
		new URL(targetWindow.location.href).searchParams.get(previewQueryParam),
	);

/** Creates a token-free key for matching a page across preview refreshes. */
export const getPreviewPageKey = (targetWindow: Window): string => {
	const url = new URL(targetWindow.location.href);
	url.searchParams.delete(previewQueryParam);
	return url.toString();
};
