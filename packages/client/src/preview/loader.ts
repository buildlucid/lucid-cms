import type {
	PreviewPageRuntime,
	PreviewPageScript,
	PreviewUpdateHandler,
} from "@lucidcms/types";
import { isBuilderPreviewFrame, resolvePreviewToken } from "./frame.js";
import { recordServerMarkup } from "./server-markup.js";
import type { PreviewController, PreviewOptions } from "./types.js";

//* where the CMS serves the preview page script, and where the script puts itself on `window` once it runs
const pageScriptPath = "/admin/preview.js";
const pageScriptKey = Symbol.for("lucid.preview-page");

const activeControllers = new WeakMap<Window, PreviewController>();

const inactiveController = (): PreviewController => ({
	active: false,
	ready: Promise.resolve(),
	token: null,
	onUpdate: () => () => undefined,
	cleanup: () => undefined,
});

/** Whether a value is a page script this client knows how to start. */
const isPageScript = (value: unknown): value is PreviewPageScript =>
	typeof value === "object" &&
	value !== null &&
	"version" in value &&
	value.version === 1 &&
	"setup" in value &&
	typeof value.setup === "function";

const readPageScript = (targetWindow: Window): PreviewPageScript | null => {
	const value: unknown = Reflect.get(targetWindow, pageScriptKey);
	return isPageScript(value) ? value : null;
};

/** Loads the CMS's preview page script, resolving with it, or null when it can't load. */
const loadPageScript = (
	targetWindow: Window,
	host: string | URL,
): Promise<PreviewPageScript | null> => {
	const existing = readPageScript(targetWindow);
	if (existing) return Promise.resolve(existing);

	const { document } = targetWindow;
	const src = new URL(pageScriptPath, host).toString();
	return new Promise((resolve) => {
		const script = document.createElement("script");
		script.src = src;
		script.async = true;
		script.addEventListener(
			"load",
			() => resolve(readPageScript(targetWindow)),
			{
				once: true,
			},
		);
		script.addEventListener(
			"error",
			() => {
				console.warn(
					`Lucid's preview script couldn't load from ${src}. Check the preview host, and that the page's Content-Security-Policy allows it.`,
				);
				resolve(null);
			},
			{ once: true },
		);
		(document.head ?? document.documentElement).append(script);
	});
};

/**
 * Loads the preview runtime from `host` inside the builder frame. Reuses the controller and
 * first-call options; returns an inactive controller during SSR or outside the builder.
 */
export const setupPreview = (
	options: PreviewOptions = {},
): PreviewController => {
	const targetWindow = typeof window === "undefined" ? null : window;
	if (!targetWindow) return inactiveController();
	const existing = activeControllers.get(targetWindow);
	if (existing) return existing;
	if (!isBuilderPreviewFrame(targetWindow)) return inactiveController();

	const handlers = new Set<PreviewUpdateHandler>();
	const morph = options.morph === true;
	const serverMarkup = morph
		? recordServerMarkup(targetWindow.document)
		: new WeakMap<Element, string>();
	let cleanedUp = false;
	let runtime: PreviewPageRuntime | null = null;
	const ready = loadPageScript(
		targetWindow,
		options.host ?? targetWindow.location.origin,
	).then((script) => {
		if (cleanedUp || !script) return;
		runtime = script.setup({ handlers, morph, serverMarkup });
	});

	const controller: PreviewController = {
		get active() {
			return !cleanedUp && runtime !== null;
		},
		ready,
		get token() {
			return cleanedUp ? null : resolvePreviewToken(targetWindow);
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
		cleanup: () => {
			if (cleanedUp) return;
			cleanedUp = true;
			handlers.clear();
			activeControllers.delete(targetWindow);
			runtime?.cleanup();
		},
	};
	activeControllers.set(targetWindow, controller);
	return controller;
};
