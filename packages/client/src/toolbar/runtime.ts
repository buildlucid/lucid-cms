import {
	defaultEditLabel,
	lucidMountPath,
	previewExitValue,
	previewQueryParam,
} from "./constants.js";
import {
	cleanPreviewUrl,
	clearStoredToken,
	detectPreviewMode,
	detectToolbarContext,
	getWindow,
	isCrossOriginEmbedded,
	storeToken,
	stripPreviewQuery,
} from "./context.js";
import { createToolbarElement } from "./element.js";
import { installPreviewNavigation } from "./navigation.js";
import type {
	ToolbarController,
	ToolbarEditLink,
	ToolbarOptions,
} from "./types.js";

const activeToolbarCleanups = new WeakMap<Window, () => void>();

const normalizeHost = (host: string | URL): URL => {
	const value = String(host).trim();
	const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value);
	const url = new URL(hasScheme ? value : `https://${value}`);
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new TypeError("Lucid toolbar host must use HTTP or HTTPS.");
	}
	return new URL(url.origin);
};

const resolveHost = (targetWindow: Window, host?: string | URL): URL =>
	host === undefined
		? new URL(targetWindow.location.origin)
		: normalizeHost(host);

const getAdminUrl = (host: URL): URL => new URL(lucidMountPath, host);

const getAdminHref = (host?: string | URL): string =>
	host === undefined
		? lucidMountPath
		: `${normalizeHost(host).origin}${lucidMountPath}`;

/** Builds the Lucid admin URL for an editable document version. */
export const buildToolbarEditHref = (
	edit: ToolbarEditLink,
	host?: string | URL,
): string | null => {
	if (!edit.collectionKey || !Number.isInteger(edit.documentId)) return null;

	const adminHref = getAdminHref(host);
	const collectionKey = encodeURIComponent(edit.collectionKey);
	if (edit.status === "revision") {
		if (!Number.isInteger(edit.versionId)) return null;
		return `${adminHref}/collections/${collectionKey}/revision/${edit.documentId}/${edit.versionId}`;
	}

	const status = encodeURIComponent(edit.status ?? "latest");
	return `${adminHref}/collections/${collectionKey}/${status}/${edit.documentId}`;
};

const checkLucidAuthentication = async (
	targetWindow: Window,
	host: URL,
): Promise<boolean> => {
	try {
		const response = await targetWindow.fetch(
			new URL(`${lucidMountPath}/api/v1/auth/status`, host),
			{
				credentials: "include",
				headers: { Accept: "application/json" },
				referrerPolicy: "no-referrer",
			},
		);
		return response.status === 204;
	} catch {
		return false;
	}
};

const resolveAuthentication = async (
	targetWindow: Window,
	host: URL,
	authentication: ToolbarOptions["authentication"],
): Promise<boolean> => {
	if (typeof authentication === "boolean") return authentication;
	if (typeof authentication === "function") {
		return await authentication();
	}
	return checkLucidAuthentication(targetWindow, host);
};

const navigateToExitUrl = (targetWindow: Window, exitUrl: URL): void => {
	if (exitUrl.origin === targetWindow.location.origin) {
		targetWindow.location.assign(exitUrl.toString());
		return;
	}

	const link = targetWindow.document.createElement("a");
	link.href = exitUrl.toString();
	link.rel = "noreferrer";
	link.referrerPolicy = "no-referrer";
	link.hidden = true;
	(targetWindow.document.body ?? targetWindow.document.documentElement).append(
		link,
	);
	link.click();
	link.remove();
};

/** Clears the persisted preview session without navigating. */
export const clearPreview = (): void => {
	const targetWindow = getWindow();
	if (!targetWindow) return;
	clearStoredToken(targetWindow);
};

const inactiveController = (): ToolbarController => ({
	active: false,
	element: null,
	preview: { active: false, token: null, source: null, mode: null },
	context: { builder: false },
	ready: Promise.resolve(),
	exitPreview: async () => undefined,
	cleanup: () => undefined,
});

/** Initializes the toolbar and returns its lifecycle controller. */
export const setupToolbar = (
	options: ToolbarOptions = {},
): ToolbarController => {
	const targetWindow = getWindow();
	if (!targetWindow) return inactiveController();

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
	const context = detectToolbarContext(targetWindow);
	const previewOptions =
		options.preview === false ? undefined : options.preview;
	const host = resolveHost(targetWindow, options.host);
	const adminUrl = getAdminUrl(host);
	const editHref = options.edit
		? buildToolbarEditHref(options.edit, host)
		: null;

	if (!preview.active && !editHref) {
		return {
			...inactiveController(),
			preview,
			context,
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

	const element = createToolbarElement(targetWindow);
	element.hidden = !preview.active;
	let cleanedUp = false;
	let exiting = false;
	let editAuthenticated = false;
	let authenticationResolved = editHref === null || context.builder;

	const cleanupNavigation = installPreviewNavigation({
		targetWindow,
		toolbar: element,
		preview,
		builder: context.builder,
		propagateInternalLinks:
			options.preview !== false &&
			preview.mode === "perspective" &&
			(previewOptions?.propagateInternalLinks ?? context.builder),
	});

	const cleanup = () => {
		if (cleanedUp) return;
		cleanedUp = true;
		cleanupNavigation();
		element.remove();
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
		exitUrl.searchParams.delete(previewQueryParam);
		if (exitUrl.origin === targetWindow.location.origin) {
			exitUrl.searchParams.set(previewQueryParam, previewExitValue);
		}
		navigateToExitUrl(targetWindow, exitUrl);
	};

	const render = () => {
		if (cleanedUp) return;
		element.setModel({
			adminHref: adminUrl.toString(),
			previewMode: preview.active ? preview.mode : null,
			builder: context.builder,
			edit:
				editAuthenticated && editHref
					? {
							href: editHref,
							label: options.edit?.label?.trim() || defaultEditLabel,
						}
					: null,
			exitPreview: preview.active ? exitPreview : null,
		});
		element.hidden = !preview.active && !editAuthenticated;
		if (element.hidden && !preview.active && authenticationResolved) {
			cleanup();
		}
	};

	activeToolbarCleanups.set(targetWindow, cleanup);
	render();

	const ready =
		editHref && !context.builder
			? resolveAuthentication(targetWindow, host, options.authentication)
					.then((authenticated) => {
						authenticationResolved = true;
						editAuthenticated = authenticated;
						render();
					})
					.catch(() => {
						authenticationResolved = true;
						editAuthenticated = false;
						render();
					})
			: Promise.resolve();

	return {
		get active() {
			return (
				!context.builder && !cleanedUp && element.isConnected && !element.hidden
			);
		},
		get element() {
			return cleanedUp ? null : element;
		},
		preview,
		context,
		ready,
		exitPreview,
		cleanup,
	};
};
