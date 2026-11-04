import { previewFrameNames } from "./constants.js";

const previewTokenPattern = /^[A-Za-z0-9_-]{43}$/;

/** Returns a valid preview token, or null. */
export const normalizePreviewToken = (
	value: string | null | undefined,
): string | null => (value && previewTokenPattern.test(value) ? value : null);

/** Whether a window is the frame the builder names for its preview. */
export const isLucidBuilderPreview = (targetWindow: Window): boolean => {
	try {
		if (targetWindow.self === targetWindow.top) return false;
	} catch {
		//* a cross-origin parent can't be read, which means the window is framed
	}
	return Object.values(previewFrameNames).some(
		(name) => name === targetWindow.name,
	);
};
