import type { PreviewSession, PreviewTarget } from "@lucidcms/types";

export {
	default as flattenFilters,
	type FlatFilterCondition,
} from "./utils/flatten-filters.js";

/**
 * Shared preview contract for URL parameters, frame names, field markup and script locations. Used
 * by admin and core.
 */

/** Query parameters on preview URLs: the token, and the builder's mark on the URLs it frames. */
export const previewParams = {
	token: "preview",
	context: "previewContext",
} as const;

export const builderPreviewContext = "builder";

/** The `preview` value that ends a stored preview. */
export const previewExitValue = "exit";

/** The name the builder gives its preview frame. */
export const previewFrameName = "lucid-preview";

/** Marks the element that renders a field, brick or repeater item. */
export const editAttribute = "data-lucid-edit";

/** Key holding preview targets on content objects. */
export const previewTargetKey = "$preview";

/** Elements with this attribute are left alone when a preview update morphs the page. */
export const keepAttribute = "data-lucid-keep";

const maxEditMarkupLength = 4096;
const editMarkupVersion = "1:";

/** CMS preview scripts and their `window` registration keys. */
export const previewScripts = {
	page: { path: "/admin/preview.js", key: Symbol.for("lucid.preview-page") },
	toolbar: {
		path: "/admin/toolbar.js",
		key: Symbol.for("lucid.preview-toolbar"),
	},
} as const;

/** The cookie server-rendered sites keep a navigable preview in while it's browsed. */
export const previewCookie = {
	name: "lucid_preview",
	options: { path: "/", httpOnly: true, sameSite: "lax" },
} as const;

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

/** Returns the value when it's shaped like a preview token, otherwise null. */
export const normalizePreviewToken = (
	value: string | null | undefined,
): string | null => (value && tokenPattern.test(value) ? value : null);

/** Whether a window is the builder's preview frame. */
export const isBuilderPreviewFrame = (targetWindow: Window): boolean => {
	if (targetWindow.name !== previewFrameName) return false;
	try {
		return targetWindow.self !== targetWindow.top;
	} catch {
		return true;
	}
};

/** Encodes a target for the edit attribute, or returns null when it's too long to mark. */
export const encodeEditMarkup = (target: PreviewTarget): string | null => {
	const encoded = `${editMarkupVersion}${encodeURIComponent(JSON.stringify(target))}`;
	return encoded.length <= maxEditMarkupLength ? encoded : null;
};

/** Decodes an edit attribute's value, which still needs validating, or returns null when it isn't one. */
export const decodeEditMarkup = (value: string): unknown => {
	if (
		value.length > maxEditMarkupLength ||
		!value.startsWith(editMarkupVersion)
	) {
		return null;
	}
	try {
		return JSON.parse(
			decodeURIComponent(value.slice(editMarkupVersion.length)),
		);
	} catch {
		return null;
	}
};

/** A navigable preview kept in the browser while its site is browsed, per CMS origin. */
export type StoredPreview = Pick<PreviewSession, "entry" | "expiresAt"> & {
	token: string;
};

const storedPreviewKey = (host: string) => `lucid.preview:${host}`;

/** Reads the navigable preview kept for a CMS origin, or null when there's none or it has expired. */
export const readStoredPreview = (
	targetWindow: Window,
	host: string,
): StoredPreview | null => {
	try {
		const value: unknown = JSON.parse(
			targetWindow.sessionStorage.getItem(storedPreviewKey(host)) ?? "null",
		);
		if (
			typeof value === "object" &&
			value !== null &&
			"token" in value &&
			"expiresAt" in value &&
			"entry" in value &&
			typeof value.token === "string" &&
			typeof value.expiresAt === "string" &&
			typeof value.entry === "object" &&
			value.entry !== null &&
			normalizePreviewToken(value.token) &&
			Date.parse(value.expiresAt) > Date.now()
		) {
			return value as StoredPreview;
		}
	} catch {
		return null;
	}
	clearStoredPreview(targetWindow, host);
	return null;
};

export const storePreview = (
	targetWindow: Window,
	host: string,
	preview: StoredPreview,
) => {
	try {
		targetWindow.sessionStorage.setItem(
			storedPreviewKey(host),
			JSON.stringify(preview),
		);
	} catch {
		return;
	}
};

export const clearStoredPreview = (targetWindow: Window, host: string) => {
	try {
		targetWindow.sessionStorage.removeItem(storedPreviewKey(host));
	} catch {
		return;
	}
};
