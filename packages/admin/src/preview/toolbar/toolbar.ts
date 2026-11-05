import {
	clearStoredPreview,
	normalizePreviewToken,
	previewExitValue,
	previewParams,
	readStoredPreview,
	storePreview,
} from "@lucidcms/client/contract";
import type {
	PreviewDocument,
	PreviewResolution,
	PreviewSession,
	PreviewToolbarOptions,
	PreviewToolbarRuntime,
} from "@lucidcms/types";
import { withoutPreviewParams } from "../links.js";
import { isSignedIn } from "./authentication.js";
import { adminMountPath, apiMountPath } from "./constants.js";
import { createToolbarElement, type ToolbarElement } from "./element.js";
import { installToolbarNavigation } from "./navigation.js";

type ActivePreview = PreviewResolution & { token: string };
type EditTarget = PreviewSession["entry"];

const readUrlToken = (targetWindow: Window) =>
	new URL(targetWindow.location.href).searchParams.get(previewParams.token);

/** Takes the preview parameters off the page's URL without navigating. */
const stripPreviewQuery = (targetWindow: Window) => {
	const url = withoutPreviewParams(new URL(targetWindow.location.href));
	targetWindow.history.replaceState(
		targetWindow.history.state,
		"",
		`${url.pathname}${url.search}${url.hash}`,
	);
};

/** Whether another site frames the page, whose session storage the page can't rely on. */
const isFramedElsewhere = (targetWindow: Window) => {
	try {
		return (
			targetWindow.self !== targetWindow.top &&
			targetWindow.top?.location.origin !== targetWindow.location.origin
		);
	} catch {
		return true;
	}
};

const isResolution = (value: unknown): value is PreviewResolution => {
	if (typeof value !== "object" || value === null) return false;
	const { mode, expiresAt, entry } = value as Record<string, unknown>;
	return (
		(mode === "navigable" || mode === "scoped") &&
		typeof expiresAt === "string" &&
		Number.isFinite(Date.parse(expiresAt)) &&
		typeof entry === "object" &&
		entry !== null &&
		"collectionKey" in entry &&
		typeof entry.collectionKey === "string" &&
		"documentId" in entry &&
		typeof entry.documentId === "number"
	);
};

const fetchResolution = async (
	targetWindow: Window,
	host: URL,
	token: string,
	signal: AbortSignal,
): Promise<PreviewResolution | null> => {
	const response = await targetWindow.fetch(
		new URL(`${apiMountPath}/v1/content/preview`, host),
		{
			method: "POST",
			credentials: "omit",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ token }),
			referrerPolicy: "no-referrer",
			signal,
		},
	);
	if (!response.ok) return null;
	const payload: unknown = await response.json();
	const data =
		typeof payload === "object" && payload !== null && "data" in payload
			? payload.data
			: null;
	return isResolution(data) ? data : null;
};

/** The preview the page shows: its URL's token, checked with the CMS, or the navigable preview being browsed. */
const resolvePreview = async (
	targetWindow: Window,
	host: URL,
	signal: AbortSignal,
): Promise<ActivePreview | null> => {
	const value = readUrlToken(targetWindow);
	if (value === previewExitValue) {
		clearStoredPreview(targetWindow, host.origin);
		stripPreviewQuery(targetWindow);
		return null;
	}

	const stored = readStoredPreview(targetWindow, host.origin);
	if (value === null || stored?.token === value) {
		return stored ? { mode: "navigable", ...stored } : null;
	}

	const token = normalizePreviewToken(value);
	const resolution = token
		? await fetchResolution(targetWindow, host, token, signal)
		: null;
	if (!token || !resolution) {
		console.warn(
			"This Lucid preview link has expired or isn't valid, so the page shows the published site.",
		);
		return null;
	}

	if (resolution.mode === "navigable") {
		storePreview(targetWindow, host.origin, {
			token,
			expiresAt: resolution.expiresAt,
			entry: resolution.entry,
		});
		if (!isFramedElsewhere(targetWindow)) stripPreviewQuery(targetWindow);
	} else {
		clearStoredPreview(targetWindow, host.origin);
	}
	return { ...resolution, token };
};

const toEditTarget = (document: PreviewDocument): EditTarget => ({
	collectionKey: document.collectionKey,
	documentId: document.id,
	version: document.version ?? "latest",
	versionId: document.meta?.versionId ?? null,
});

/** The admin page that edits a document's version, or null for a revision without its ID. */
const getEditHref = (host: URL, target: EditTarget): string | null => {
	const collection = `${host.origin}${adminMountPath}/collections/${encodeURIComponent(target.collectionKey)}`;
	if (target.version === "revision") {
		return target.versionId === null
			? null
			: `${collection}/revision/${target.documentId}/${target.versionId}`;
	}
	return `${collection}/${encodeURIComponent(target.version)}/${target.documentId}`;
};

/**
 * Starts the toolbar outside the builder frame, preserving navigable previews and offering exit
 * and document edit links.
 */
export const setupToolbar = (
	options: PreviewToolbarOptions,
): PreviewToolbarRuntime => {
	const targetWindow = window;
	const host = new URL(options.host);
	let document = options.document;
	let preview: ActivePreview | null = null;
	let signedIn = false;
	let element: ToolbarElement | null = null;
	let cleanupNavigation: () => void = () => undefined;
	let revision = 0;
	let pending: AbortController | null = null;
	let cleanedUp = false;

	const getEdit = () => {
		if (document) {
			return { target: toEditTarget(document), label: "Edit page" };
		}
		if (!preview) return null;
		return {
			target: preview.entry,
			label:
				preview.mode === "scoped" ? "Edit page" : "Edit previewed document",
		};
	};

	const render = () => {
		const edit = getEdit();
		const href = edit && signedIn ? getEditHref(host, edit.target) : null;
		if (!options.visible || (!preview && !href)) {
			element?.remove();
			element = null;
			return;
		}
		element ??= createToolbarElement(targetWindow);
		element.setModel({
			adminHref: `${host.origin}${adminMountPath}`,
			previewMode: preview?.mode ?? null,
			edit: edit && href ? { href, label: edit.label } : null,
			exitPreview: preview ? exit : null,
		});
	};

	const showPreview = (next: ActivePreview | null) => {
		preview = next;
		cleanupNavigation();
		cleanupNavigation = next
			? installToolbarNavigation(targetWindow, next)
			: () => undefined;
		render();
	};

	const reconcile = async () => {
		const current = ++revision;
		pending?.abort();
		const controller = new AbortController();
		pending = controller;

		const next = await resolvePreview(
			targetWindow,
			host,
			controller.signal,
		).catch(() => null);
		if (cleanedUp || current !== revision) return;
		showPreview(next);

		const edit = getEdit();
		signedIn = edit ? await isSignedIn(targetWindow, host) : false;
		if (cleanedUp || current !== revision) return;
		render();
	};

	const exit = async () => {
		if (!preview) return;
		revision += 1;
		pending?.abort();
		clearStoredPreview(targetWindow, host.origin);
		showPreview(null);

		//* the exit value tells server-rendered sites to drop their preview cookie
		const url = new URL(targetWindow.location.href);
		url.searchParams.delete(previewParams.context);
		url.searchParams.set(previewParams.token, previewExitValue);
		if (options.navigate) {
			await options.navigate(url);
			if (readUrlToken(targetWindow) === previewExitValue) {
				stripPreviewQuery(targetWindow);
			}
			return;
		}
		targetWindow.location.assign(url.toString());
	};

	void reconcile();

	return {
		setDocument: (next) => {
			if (cleanedUp) return;
			document = next;
			void reconcile();
		},
		exit,
		cleanup: () => {
			if (cleanedUp) return;
			cleanedUp = true;
			pending?.abort();
			cleanupNavigation();
			element?.remove();
			element = null;
		},
	};
};
