import type { DocumentVersionType } from "@lucidcms/types";

const previewTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const previewQueryParam = "preview";
const previewExitValue = "exit";
const previewStorageKey = "lucid.preview.token";
const toolbarAttribute = "data-lucid-toolbar";
const styleAttribute = "data-lucid-toolbar-styles";
const defaultDashboardHref = "/lucid";
const defaultEditLabel = "Edit document";

const activeToolbarCleanups = new WeakMap<Window, () => void>();

export type PreviewModeSource = "explicit" | "url" | "stored";
export type PreviewKind = "perspective" | "exact";

export type PreviewModeState = {
	active: boolean;
	token: string | null;
	source: PreviewModeSource | null;
	mode: PreviewKind | null;
};

export type ToolbarEditLink = {
	collectionKey: string;
	documentId: number;
	status?: DocumentVersionType | null;
	versionId?: number | null;
	/** Defaults to `Edit document`. */
	label?: string;
};

export type ToolbarPreviewOptions = {
	/** Explicit preview token supplied by a server-rendered frontend. */
	token?: string | null;
	/** Server-resolved preview mode. Defaults to `perspective`. */
	mode?: PreviewKind;
	/** URL requested when preview ends. Defaults to the current page. */
	exitUrl?: string | URL;
	/** Optional additional cleanup before navigating with `preview=exit`. */
	onExit?: () => void | Promise<void>;
	/** Override same-origin token forwarding. It defaults to enabled inside an iframe. */
	propagateInternalLinks?: boolean;
	/** Remove the bearer token from the visible URL after activation. Defaults to true outside a cross-origin iframe. */
	stripTokenFromUrl?: boolean;
};

export type ToolbarOptions = {
	/** Lucid's mounted dashboard URL. Defaults to `/lucid`. */
	dashboardHref?: string | URL;
	/** Document metadata used to build the authenticated edit-page action. */
	edit?: ToolbarEditLink;
	/** Preview controls, or `false` when the server explicitly resolved published mode. */
	preview?: ToolbarPreviewOptions | false;
	/** Override the same-origin Lucid account check used for the edit action. */
	authentication?: boolean | (() => boolean | Promise<boolean>);
};

export type ToolbarController = {
	readonly active: boolean;
	readonly element: HTMLElement | null;
	readonly preview: PreviewModeState;
	/** Resolves after optional edit-action authentication has completed. */
	readonly ready: Promise<void>;
	exitPreview: () => Promise<void>;
	cleanup: () => void;
};

type ToolbarView = {
	element: HTMLElement;
	actions: HTMLElement;
	separator: HTMLElement;
};

const getWindow = (): Window | null =>
	typeof window === "undefined" ? null : window;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const normalizeToken = (value: string | null | undefined): string | null =>
	value && previewTokenPattern.test(value) ? value : null;

const readStoredToken = (targetWindow: Window): string | null => {
	try {
		return normalizeToken(
			targetWindow.sessionStorage.getItem(previewStorageKey),
		);
	} catch {
		return null;
	}
};

const storeToken = (targetWindow: Window, token: string): void => {
	try {
		targetWindow.sessionStorage.setItem(previewStorageKey, token);
	} catch {
		return;
	}
};

const clearStoredToken = (targetWindow: Window): void => {
	try {
		targetWindow.sessionStorage.removeItem(previewStorageKey);
	} catch {
		return;
	}
};

/** Detects preview mode without touching browser globals when rendered on the server. */
export const detectPreviewMode = (
	token?: string | null,
	mode: PreviewKind = "perspective",
): PreviewModeState => {
	const explicitToken = normalizeToken(token);
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

	const urlToken = normalizeToken(urlValue);
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

const cleanPreviewUrl = (targetWindow: Window): URL => {
	const url = new URL(targetWindow.location.href);
	url.searchParams.delete(previewQueryParam);
	return url;
};

const stripPreviewQuery = (targetWindow: Window): void => {
	const cleanUrl = cleanPreviewUrl(targetWindow);
	targetWindow.history.replaceState(
		targetWindow.history.state,
		"",
		`${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`,
	);
};

const isEmbedded = (targetWindow: Window): boolean => {
	try {
		return targetWindow.self !== targetWindow.top;
	} catch {
		return true;
	}
};

const isCrossOriginEmbedded = (targetWindow: Window): boolean => {
	if (!isEmbedded(targetWindow)) return false;

	try {
		return targetWindow.top?.location.origin !== targetWindow.location.origin;
	} catch {
		return true;
	}
};

const normalizeDashboardUrl = (
	targetWindow: Window,
	dashboardHref?: string | URL,
): URL =>
	new URL(dashboardHref ?? defaultDashboardHref, targetWindow.location.href);

export const buildToolbarEditHref = (
	edit: ToolbarEditLink,
	dashboardHref: string | URL = defaultDashboardHref,
): string | null => {
	if (!edit.collectionKey || !Number.isInteger(edit.documentId)) return null;

	const dashboard = String(dashboardHref).replace(/\/$/, "");
	const collectionKey = encodeURIComponent(edit.collectionKey);
	if (edit.status === "revision") {
		if (!Number.isInteger(edit.versionId)) return null;
		return `${dashboard}/collections/${collectionKey}/revision/${edit.documentId}/${edit.versionId}`;
	}

	const status = encodeURIComponent(edit.status ?? "latest");
	return `${dashboard}/collections/${collectionKey}/${status}/${edit.documentId}`;
};

const readCsrfToken = async (response: Response): Promise<string | null> => {
	const payload: unknown = await response.json().catch(() => null);
	if (!isRecord(payload) || !isRecord(payload.data)) return null;
	return typeof payload.data._csrf === "string" ? payload.data._csrf : null;
};

const checkLucidAuthentication = async (
	targetWindow: Window,
	dashboardUrl: URL,
): Promise<boolean> => {
	if (dashboardUrl.origin !== targetWindow.location.origin) return false;

	const mountPath = dashboardUrl.pathname.replace(/\/$/, "");
	const request = (path: string, init?: RequestInit) =>
		targetWindow.fetch(`${mountPath}${path}`, {
			...init,
			credentials: "same-origin",
			headers: { Accept: "application/json", ...init?.headers },
		});

	try {
		const account = await request("/api/v1/account");
		if (account.ok) return true;
		if (account.status !== 401) return false;

		const csrf = await request("/api/v1/auth/csrf");
		if (!csrf.ok) return false;
		const csrfToken = await readCsrfToken(csrf);
		if (!csrfToken) return false;

		const refresh = await request("/api/v1/auth/token", {
			method: "POST",
			headers: { "X-CSRF-Token": csrfToken },
		});
		if (refresh.status !== 204) return false;

		return (await request("/api/v1/account")).ok;
	} catch {
		return false;
	}
};

const resolveAuthentication = async (
	targetWindow: Window,
	dashboardUrl: URL,
	authentication: ToolbarOptions["authentication"],
): Promise<boolean> => {
	if (typeof authentication === "boolean") return authentication;
	if (typeof authentication === "function") {
		return await authentication();
	}
	return checkLucidAuthentication(targetWindow, dashboardUrl);
};

const toolbarStyles = `
@keyframes lucid-toolbar-in {
	from { opacity: 0; transform: translateY(10px) scale(0.98); }
	to { opacity: 1; transform: translateY(0) scale(1); }
}

.lucid-toolbar {
	position: fixed;
	right: 0.75rem;
	left: auto;
	bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
	z-index: 2147483647;
	display: flex;
	justify-content: flex-end;
	pointer-events: none;
	max-width: calc(100vw - 1.5rem);
	animation: lucid-toolbar-in 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.lucid-toolbar__pill {
	pointer-events: auto;
	display: inline-flex;
	align-items: center;
	gap: 0.125rem;
	max-width: 100%;
	padding: 0.25rem;
	border: 1px solid rgba(193, 254, 119, 0.06);
	border-radius: 999px;
	background: rgba(10, 10, 10, 0.94);
	backdrop-filter: blur(24px);
	-webkit-backdrop-filter: blur(24px);
	box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.03), 0 4px 24px rgba(0, 0, 0, 0.5);
	color: rgba(255, 255, 255, 0.88);
	font: 500 13px/1 Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

.lucid-toolbar__brand {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	height: 1.75rem;
	padding: 0 0.5rem 0 0.4rem;
	color: inherit;
	text-decoration: none;
	border-radius: 999px;
	transition: background 200ms ease;
}

.lucid-toolbar__brand:hover { background: rgba(255, 255, 255, 0.05); }

.lucid-toolbar__brand-mark {
	width: 0.5rem;
	height: 0.5rem;
	border-radius: 0.175rem;
	background: #c1fe77;
	flex-shrink: 0;
	box-shadow: 0 0 6px rgba(193, 254, 119, 0.3);
}

.lucid-toolbar__brand-label {
	font-size: 13px;
	font-weight: 600;
	letter-spacing: -0.01em;
	color: rgba(255, 255, 255, 0.9);
}

.lucid-toolbar__separator {
	width: 1px;
	height: 0.875rem;
	margin: 0 0.125rem;
	background: rgba(255, 255, 255, 0.08);
	flex-shrink: 0;
}

.lucid-toolbar__actions {
	display: flex;
	align-items: center;
	gap: 0.125rem;
}

.lucid-toolbar__action {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.375rem;
	height: 1.75rem;
	padding: 0 0.625rem;
	border: none;
	border-radius: 999px;
	background: transparent;
	color: rgba(255, 255, 255, 0.55);
	text-decoration: none;
	font: inherit;
	font-size: 13px;
	cursor: pointer;
	white-space: nowrap;
	transition: background 200ms ease, color 200ms ease;
}

.lucid-toolbar__action:hover {
	background: rgba(255, 255, 255, 0.06);
	color: rgba(255, 255, 255, 0.92);
}

.lucid-toolbar__icon {
	width: 10px;
	height: 10px;
	display: block;
	flex-shrink: 0;
}

@media (max-width: 720px) {
	.lucid-toolbar {
		right: 0.5rem;
		max-width: calc(100vw - 1rem);
		bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
	}
}

@media (prefers-reduced-motion: reduce) {
	.lucid-toolbar { animation: none; }
}
`;

const createToolbar = (
	targetDocument: Document,
	dashboardUrl: URL,
): ToolbarView => {
	let styles = targetDocument.head.querySelector<HTMLStyleElement>(
		`style[${styleAttribute}]`,
	);
	if (!styles) {
		styles = targetDocument.createElement("style");
		styles.setAttribute(styleAttribute, "true");
		styles.textContent = toolbarStyles;
		targetDocument.head.append(styles);
	}

	const element = targetDocument.createElement("div");
	element.setAttribute(toolbarAttribute, "true");
	element.innerHTML = `<div class="lucid-toolbar"><div class="lucid-toolbar__pill"><a class="lucid-toolbar__brand"><span class="lucid-toolbar__brand-mark" aria-hidden="true"></span><span class="lucid-toolbar__brand-label">Lucid CMS</span></a><span class="lucid-toolbar__separator" aria-hidden="true"></span><div class="lucid-toolbar__actions"></div></div></div>`;
	const brand = element.querySelector<HTMLAnchorElement>(
		".lucid-toolbar__brand",
	);
	const actions = element.querySelector<HTMLElement>(".lucid-toolbar__actions");
	const separator = element.querySelector<HTMLElement>(
		".lucid-toolbar__separator",
	);
	if (!brand || !actions || !separator) {
		throw new Error("Lucid toolbar markup could not be initialized.");
	}

	brand.href = dashboardUrl.toString();
	targetDocument.body.append(element);

	return { element, actions, separator };
};

const editIcon = `<svg class="lucid-toolbar__icon" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l119.8-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 219.3 291.7 90.3z"/></svg>`;
const exitIcon = `<svg class="lucid-toolbar__icon" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true"><path d="M342.6 182.6c12.5-12.5 12.5-32.8 0-45.3l-96-96c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L242.7 128H96c-53 0-96 43-96 96v96c0 53 43 96 96 96h32c17.7 0 32-14.3 32-32s-14.3-32-32-32H96c-17.7 0-32-14.3-32-32v-96c0-17.7 14.3-32 32-32h146.7l-41.4 41.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l96-96z"/></svg>`;

const createEditAction = (
	targetDocument: Document,
	href: string,
	label: string,
): HTMLAnchorElement => {
	const action = targetDocument.createElement("a");
	action.className = "lucid-toolbar__action";
	action.href = href;
	action.innerHTML = editIcon;
	action.append(targetDocument.createTextNode(label));
	return action;
};

const createExitAction = (
	targetDocument: Document,
	exitPreview: () => Promise<void>,
): HTMLButtonElement => {
	const action = targetDocument.createElement("button");
	action.className = "lucid-toolbar__action";
	action.type = "button";
	action.innerHTML = exitIcon;
	action.append(targetDocument.createTextNode("Exit preview"));
	action.addEventListener("click", () => {
		void exitPreview().catch(() => undefined);
	});
	return action;
};

const findAnchor = (target: EventTarget | null): HTMLAnchorElement | null => {
	if (!(target instanceof Element)) return null;
	return target.closest("a[href]");
};

/** Clears the browser-owned preview token without navigating. */
export const clearPreview = (): void => {
	const targetWindow = getWindow();
	if (!targetWindow) return;
	clearStoredToken(targetWindow);
};

/** Sets up Lucid's framework-neutral document and preview toolbar. */
export const setupToolbar = (
	options: ToolbarOptions = {},
): ToolbarController => {
	const targetWindow = getWindow();
	if (!targetWindow) {
		return {
			active: false,
			element: null,
			preview: { active: false, token: null, source: null, mode: null },
			ready: Promise.resolve(),
			exitPreview: async () => undefined,
			cleanup: () => undefined,
		};
	}

	activeToolbarCleanups.get(targetWindow)?.();

	const currentUrl = new URL(targetWindow.location.href);
	const exitRequested =
		currentUrl.searchParams.get(previewQueryParam) === previewExitValue;
	if (exitRequested || options.preview === false) {
		clearStoredToken(targetWindow);
	}
	if (
		(exitRequested || options.preview === false) &&
		currentUrl.searchParams.has(previewQueryParam)
	) {
		stripPreviewQuery(targetWindow);
	}

	const preview =
		options.preview === false
			? { active: false, token: null, source: null, mode: null }
			: detectPreviewMode(options.preview?.token, options.preview?.mode);
	const previewOptions =
		options.preview === false ? undefined : options.preview;
	const dashboardUrl = normalizeDashboardUrl(
		targetWindow,
		options.dashboardHref,
	);
	const editHref = options.edit
		? buildToolbarEditHref(options.edit, dashboardUrl.toString())
		: null;

	if (!preview.active && !editHref) {
		return {
			active: false,
			element: null,
			preview,
			ready: Promise.resolve(),
			exitPreview: async () => undefined,
			cleanup: () => undefined,
		};
	}

	if (preview.active && preview.token) {
		if (preview.mode === "perspective") {
			storeToken(targetWindow, preview.token);
		} else {
			clearStoredToken(targetWindow);
		}
		const shouldStripToken =
			previewOptions?.stripTokenFromUrl ??
			(preview.mode === "perspective" && !isCrossOriginEmbedded(targetWindow));
		if (shouldStripToken) stripPreviewQuery(targetWindow);
	}

	const view = createToolbar(targetWindow.document, dashboardUrl);
	view.element.hidden = !preview.active;
	let cleanedUp = false;
	let exiting = false;
	let editAuthenticated = false;
	let authenticationResolved = editHref === null;

	const cleanup = () => {
		if (cleanedUp) return;
		cleanedUp = true;
		targetWindow.document.removeEventListener("click", onDocumentClick, true);
		view.element.remove();
		if (!targetWindow.document.querySelector(`[${toolbarAttribute}]`)) {
			targetWindow.document.querySelector(`style[${styleAttribute}]`)?.remove();
		}
		activeToolbarCleanups.delete(targetWindow);
	};

	const exitPreview = async () => {
		if (exiting || !preview.active) return;
		exiting = true;
		try {
			await previewOptions?.onExit?.();
		} catch (error) {
			exiting = false;
			throw error;
		}

		clearStoredToken(targetWindow);
		cleanup();
		const exitUrl = previewOptions?.exitUrl
			? new URL(previewOptions.exitUrl, targetWindow.location.href)
			: cleanPreviewUrl(targetWindow);
		if (exitUrl.origin === targetWindow.location.origin) {
			exitUrl.searchParams.set(previewQueryParam, previewExitValue);
		}
		targetWindow.location.assign(exitUrl.toString());
	};

	const renderActions = () => {
		if (cleanedUp) return;
		const actions: Array<HTMLElement> = [];
		if (editAuthenticated && editHref) {
			actions.push(
				createEditAction(
					targetWindow.document,
					editHref,
					options.edit?.label?.trim() || defaultEditLabel,
				),
			);
		}
		if (preview.active) {
			actions.push(createExitAction(targetWindow.document, exitPreview));
		}

		view.actions.replaceChildren(...actions);
		view.separator.hidden = actions.length === 0;
		view.actions.hidden = actions.length === 0;
		view.element.hidden = actions.length === 0 && !preview.active;
		if (view.element.hidden && !preview.active && authenticationResolved) {
			cleanup();
		}
	};

	const propagateInternalLinks =
		options.preview !== false &&
		preview.mode === "perspective" &&
		(previewOptions?.propagateInternalLinks ?? isEmbedded(targetWindow));
	const onDocumentClick = (event: MouseEvent) => {
		if (!preview.active || !preview.token || !propagateInternalLinks) return;
		if (event.defaultPrevented) return;
		const anchor = findAnchor(event.target);
		if (!anchor || anchor.hasAttribute("download")) return;
		if (anchor.closest(`[${toolbarAttribute}]`)) return;

		let url: URL;
		try {
			url = new URL(anchor.href, targetWindow.location.href);
		} catch {
			return;
		}
		if (url.origin !== targetWindow.location.origin) return;
		if (url.protocol !== "http:" && url.protocol !== "https:") return;

		url.searchParams.set(previewQueryParam, preview.token);
		anchor.href = url.toString();
	};

	activeToolbarCleanups.set(targetWindow, cleanup);
	targetWindow.document.addEventListener("click", onDocumentClick, true);
	renderActions();

	const ready = editHref
		? resolveAuthentication(targetWindow, dashboardUrl, options.authentication)
				.then((authenticated) => {
					authenticationResolved = true;
					editAuthenticated = authenticated;
					renderActions();
				})
				.catch(() => {
					authenticationResolved = true;
					editAuthenticated = false;
					renderActions();
				})
		: Promise.resolve();

	return {
		get active() {
			return !cleanedUp && view.element.isConnected && !view.element.hidden;
		},
		get element() {
			return cleanedUp ? null : view.element;
		},
		preview,
		ready,
		exitPreview,
		cleanup,
	};
};
