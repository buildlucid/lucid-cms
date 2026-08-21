import type { PreviewRuntimeState } from "@lucidcms/types";
import {
	normalizePreviewToken,
	previewContextQueryParam,
	previewQueryParam,
} from "../utils/preview.js";
import { previewExitValue, previewStorageKey } from "./constants.js";

type ActivePreview = Extract<PreviewRuntimeState, { kind: "preview" }>;
type PerspectivePreview = ActivePreview & { mode: "perspective" };

export type BrowserPreviewCandidate =
	| { kind: "published" }
	| { kind: "preview"; preview: PerspectivePreview }
	| { kind: "token"; token: string }
	| { kind: "invalid" };

const getPreviewStorageKey = (host: URL): string =>
	`${previewStorageKey}:${encodeURIComponent(host.origin)}`;

const parseStoredPreview = (value: unknown): PerspectivePreview | null => {
	if (typeof value !== "object" || value === null) return null;
	if (
		!("kind" in value) ||
		value.kind !== "preview" ||
		!("token" in value) ||
		typeof value.token !== "string" ||
		!("mode" in value) ||
		value.mode !== "perspective" ||
		!("expiresAt" in value) ||
		typeof value.expiresAt !== "string"
	) {
		return null;
	}

	const token = normalizePreviewToken(value.token);
	const expiresAt = new Date(value.expiresAt).getTime();
	if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
		return null;
	}

	return {
		kind: "preview",
		token,
		mode: value.mode,
		expiresAt: value.expiresAt,
	};
};

/** Reads a validated perspective preview from origin-scoped session storage. */
const readStoredPreview = (
	targetWindow: Window,
	host: URL,
): PerspectivePreview | null => {
	try {
		const value = targetWindow.sessionStorage.getItem(
			getPreviewStorageKey(host),
		);
		if (!value) return null;
		const parsed: unknown = JSON.parse(value);
		const preview = parseStoredPreview(parsed);
		if (!preview) clearStoredPreview(targetWindow, host);
		return preview;
	} catch {
		clearStoredPreview(targetWindow, host);
		return null;
	}
};

/** Persists a resolved perspective preview for same-origin navigation. */
export const storePreview = (
	targetWindow: Window,
	host: URL,
	preview: Pick<ActivePreview, "token" | "expiresAt">,
): void => {
	try {
		targetWindow.sessionStorage.setItem(
			getPreviewStorageKey(host),
			JSON.stringify({
				kind: "preview",
				mode: "perspective",
				token: preview.token,
				expiresAt: preview.expiresAt,
			} satisfies PerspectivePreview),
		);
	} catch {
		return;
	}
};

/** Removes the stored preview for one CMS origin. */
export const clearStoredPreview = (targetWindow: Window, host: URL): void => {
	try {
		targetWindow.sessionStorage.removeItem(getPreviewStorageKey(host));
	} catch {
		return;
	}
};

/** Resolves the browser-owned preview candidate without making network requests. */
export const detectBrowserPreview = (
	targetWindow: Window,
	host: URL,
	url: URL,
): BrowserPreviewCandidate => {
	const hasPreviewQuery = url.searchParams.has(previewQueryParam);
	const queryValue = url.searchParams.get(previewQueryParam);

	if (queryValue === previewExitValue) {
		clearStoredPreview(targetWindow, host);
		return { kind: "published" };
	}

	if (hasPreviewQuery) {
		const token = normalizePreviewToken(queryValue);
		if (!token) return { kind: "invalid" };
		const stored = readStoredPreview(targetWindow, host);
		return stored?.token === token
			? { kind: "preview", preview: stored }
			: { kind: "token", token };
	}

	const stored = readStoredPreview(targetWindow, host);
	return stored ? { kind: "preview", preview: stored } : { kind: "published" };
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
