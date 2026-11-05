import { withoutPreviewParams } from "../links.js";

/** Creates a preview-free key for matching a page across preview refreshes. */
export const getPreviewPageKey = (targetWindow: Window): string =>
	withoutPreviewParams(new URL(targetWindow.location.href)).toString();
