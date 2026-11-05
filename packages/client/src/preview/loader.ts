import type {
	PreviewPageRuntime,
	PreviewPageScript,
	PreviewToolbarRuntime,
	PreviewToolbarScript,
	PreviewUpdateHandler,
} from "@lucidcms/types";
import {
	isBuilderPreviewFrame,
	normalizePreviewToken,
	previewParams,
	previewScripts,
	readStoredPreview,
} from "../contract.js";
import { loadScript } from "./scripts.js";
import { recordServerMarkup } from "./server-markup.js";
import type { PreviewController, PreviewOptions } from "./types.js";

const activeControllers = new WeakMap<Window, PreviewController>();

const inactiveController = (): PreviewController => ({
	active: false,
	ready: Promise.resolve(),
	token: null,
	onUpdate: () => () => undefined,
	setDocument: () => undefined,
	exit: async () => undefined,
	cleanup: () => undefined,
});

const readUrlToken = (targetWindow: Window) =>
	new URL(targetWindow.location.href).searchParams.get(previewParams.token);

/** Runs the CMS's page script in the builder's preview frame, which shows edits and draws edit mode. */
const createBuilderController = (
	targetWindow: Window,
	host: string,
	options: PreviewOptions,
	remove: () => void,
): PreviewController => {
	const handlers = new Set<PreviewUpdateHandler>();
	const morph = options.morph === true;
	const serverMarkup = morph
		? recordServerMarkup(targetWindow.document)
		: new WeakMap<Element, string>();
	let cleanedUp = false;
	let runtime: PreviewPageRuntime | null = null;
	const ready = loadScript<PreviewPageScript>(
		targetWindow,
		host,
		previewScripts.page,
	).then((script) => {
		if (cleanedUp || !script) return;
		runtime = script.setup({ handlers, morph, serverMarkup });
	});

	return {
		get active() {
			return !cleanedUp && runtime !== null;
		},
		ready,
		get token() {
			return cleanedUp
				? null
				: normalizePreviewToken(readUrlToken(targetWindow));
		},
		onUpdate: (handler) => {
			if (cleanedUp) return () => undefined;
			handlers.add(handler);
			runtime?.handlersChanged();
			return () => {
				if (cleanedUp) return;
				handlers.delete(handler);
				runtime?.handlersChanged();
			};
		},
		setDocument: () => undefined,
		exit: async () => undefined,
		cleanup: () => {
			if (cleanedUp) return;
			cleanedUp = true;
			handlers.clear();
			remove();
			runtime?.cleanup();
		},
	};
};

/** Runs the CMS's toolbar script on previews, and for signed-in editors when the page names its document. */
const createSiteController = (
	targetWindow: Window,
	host: string,
	options: PreviewOptions,
	remove: () => void,
): PreviewController => {
	let document = options.document ?? null;
	let cleanedUp = false;
	let runtime: PreviewToolbarRuntime | null = null;
	let loading: Promise<void> | null = null;

	const start = () => {
		loading ??= loadScript<PreviewToolbarScript>(
			targetWindow,
			host,
			previewScripts.toolbar,
		).then((script) => {
			if (cleanedUp || !script) return;
			runtime = script.setup({
				host,
				document,
				visible: options.toolbar !== false,
				navigate: options.navigate,
			});
		});
		return loading;
	};
	const previewing =
		readUrlToken(targetWindow) !== null ||
		readStoredPreview(targetWindow, host) !== null;
	if (document || previewing) void start();

	return {
		get active() {
			return !cleanedUp && runtime !== null;
		},
		get ready() {
			return loading ?? Promise.resolve();
		},
		get token() {
			if (cleanedUp) return null;
			return (
				normalizePreviewToken(readUrlToken(targetWindow)) ??
				readStoredPreview(targetWindow, host)?.token ??
				null
			);
		},
		onUpdate: () => () => undefined,
		setDocument: (next) => {
			if (cleanedUp) return;
			document = next;
			if (runtime) runtime.setDocument(next);
			else if (next) void start();
		},
		exit: async () => {
			await loading;
			await runtime?.exit();
		},
		cleanup: () => {
			if (cleanedUp) return;
			cleanedUp = true;
			remove();
			runtime?.cleanup();
		},
	};
};

/**
 * Starts the builder runtime inside its frame, otherwise the toolbar. Reuses the controller with
 * first-call options. Returns an inactive controller during SSR.
 */
export const setupPreview = (
	options: PreviewOptions = {},
): PreviewController => {
	const targetWindow = typeof window === "undefined" ? null : window;
	if (!targetWindow) return inactiveController();
	const existing = activeControllers.get(targetWindow);
	if (existing) return existing;

	const host = new URL(options.host ?? targetWindow.location.origin).origin;
	const remove = () => activeControllers.delete(targetWindow);
	const controller = isBuilderPreviewFrame(targetWindow)
		? createBuilderController(targetWindow, host, options, remove)
		: createSiteController(targetWindow, host, options, remove);
	activeControllers.set(targetWindow, controller);
	return controller;
};
