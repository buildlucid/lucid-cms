import {
	isLucidBuilderPreview,
	normalizePreviewToken,
	previewContextQueryParam,
	previewQueryParam,
} from "../utils/preview.js";
import { previewExitValue, previewStorageKey } from "./constants.js";
import type {
	PreviewKind,
	PreviewModeState,
	ToolbarContextState,
} from "./types.js";

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
	targetWindow: Window,
): ToolbarContextState => ({
	builder: isLucidBuilderPreview(targetWindow),
});

/** Resolves preview mode from explicit, URL, or stored state. */
export const detectPreviewMode = (
	targetWindow: Window,
	token?: string | null,
	mode: PreviewKind = "perspective",
): PreviewModeState => {
	const explicitToken = normalizePreviewToken(token);
	if (explicitToken) {
		return { active: true, token: explicitToken, source: "explicit", mode };
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

/** Returns the current URL without preview query parameters. */
export const cleanPreviewUrl = (targetWindow: Window): URL => {
	const url = new URL(targetWindow.location.href);
	url.searchParams.delete(previewQueryParam);
	url.searchParams.delete(previewContextQueryParam);
	return url;
};

/** Removes preview query parameters without navigating. */
export const stripPreviewQuery = (targetWindow: Window): void => {
	const cleanUrl = cleanPreviewUrl(targetWindow);
	targetWindow.history.replaceState(
		targetWindow.history.state,
		"",
		`${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`,
	);
};
