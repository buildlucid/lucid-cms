import {
	lucidBuilderPreviewFrameName,
	previewExitValue,
	previewQueryParam,
	previewStorageKey,
} from "./constants.js";
import type {
	PreviewKind,
	PreviewModeState,
	ToolbarContextState,
} from "./types.js";

const previewTokenPattern = /^[A-Za-z0-9_-]{43}$/;

/** Returns the browser window, or `null` during SSR. */
export const getWindow = (): Window | null =>
	typeof window === "undefined" ? null : window;

/** Returns a valid preview token, or `null`. */
export const normalizePreviewToken = (
	value: string | null | undefined,
): string | null => (value && previewTokenPattern.test(value) ? value : null);

/** Reads the active preview token from session storage. */
export const readStoredToken = (targetWindow: Window): string | null => {
	try {
		return normalizePreviewToken(
			targetWindow.sessionStorage.getItem(previewStorageKey),
		);
	} catch {
		return null;
	}
};

/** Stores a preview token for same-site navigation. */
export const storeToken = (targetWindow: Window, token: string): void => {
	try {
		targetWindow.sessionStorage.setItem(previewStorageKey, token);
	} catch {
		return;
	}
};

/** Removes the stored preview token. */
export const clearStoredToken = (targetWindow: Window): void => {
	try {
		targetWindow.sessionStorage.removeItem(previewStorageKey);
	} catch {
		return;
	}
};

const isEmbedded = (targetWindow: Window): boolean => {
	try {
		return targetWindow.self !== targetWindow.top;
	} catch {
		return true;
	}
};

/** Reports whether the window is embedded by a different origin. */
export const isCrossOriginEmbedded = (targetWindow: Window): boolean => {
	if (!isEmbedded(targetWindow)) return false;

	try {
		return targetWindow.top?.location.origin !== targetWindow.location.origin;
	} catch {
		return true;
	}
};

/** Detects Lucid's builder iframe without treating arbitrary embedding as builder context. */
export const detectToolbarContext = (
	targetWindow: Window | null = getWindow(),
): ToolbarContextState => ({
	builder:
		targetWindow !== null &&
		isEmbedded(targetWindow) &&
		targetWindow.name === lucidBuilderPreviewFrameName,
});

/** Detects preview mode without touching browser globals when rendered on the server. */
export const detectPreviewMode = (
	token?: string | null,
	mode: PreviewKind = "perspective",
): PreviewModeState => {
	const explicitToken = normalizePreviewToken(token);
	if (explicitToken) {
		return { active: true, token: explicitToken, source: "explicit", mode };
	}

	const targetWindow = getWindow();
	if (!targetWindow) {
		return { active: false, token: null, source: null, mode: null };
	}

	const urlValue = new URL(targetWindow.location.href).searchParams.get(
		previewQueryParam,
	);
	if (urlValue === previewExitValue) {
		return { active: false, token: null, source: null, mode: null };
	}

	const urlToken = normalizePreviewToken(urlValue);
	if (urlToken) {
		return { active: true, token: urlToken, source: "url", mode };
	}

	const storedToken = readStoredToken(targetWindow);
	return storedToken
		? {
				active: true,
				token: storedToken,
				source: "stored",
				mode: "perspective",
			}
		: { active: false, token: null, source: null, mode: null };
};

/** Returns the current URL without the preview query parameter. */
export const cleanPreviewUrl = (targetWindow: Window): URL => {
	const url = new URL(targetWindow.location.href);
	url.searchParams.delete(previewQueryParam);
	return url;
};

/** Removes the preview query parameter without navigating. */
export const stripPreviewQuery = (targetWindow: Window): void => {
	const cleanUrl = cleanPreviewUrl(targetWindow);
	targetWindow.history.replaceState(
		targetWindow.history.state,
		"",
		`${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`,
	);
};
