import { previewQueryParams } from "../protocol/index.js";

/** Creates a preview-free key for matching a page across preview refreshes. */
export const getPreviewPageKey = (targetWindow: Window): string => {
	const url = new URL(targetWindow.location.href);
	url.searchParams.delete(previewQueryParams.token);
	url.searchParams.delete(previewQueryParams.context);
	return url.toString();
};
