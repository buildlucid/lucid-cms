import { getBuilderPreviewMode, getWindow } from "../utils/preview.js";
import { resolvePreviewToken } from "./context.js";
import type { PreviewRuntime } from "./runtime.js";
import type { PreviewController, PreviewUpdateHandler } from "./types.js";

const activeControllers = new WeakMap<Window, PreviewController>();

const inactiveController = (): PreviewController => ({
	active: false,
	ready: Promise.resolve(),
	token: null,
	onUpdate: () => () => undefined,
	cleanup: () => undefined,
});

/**
 * Initializes the preview runtime, reusing its controller until cleanup. Returns an inactive
 * controller during SSR or outside a builder iframe.
 */
export const setupPreview = (): PreviewController => {
	const targetWindow = getWindow();
	if (!targetWindow) return inactiveController();
	const existing = activeControllers.get(targetWindow);
	if (existing) return existing;
	const mode = getBuilderPreviewMode(targetWindow);
	if (!mode) return inactiveController();

	const handlers = new Set<PreviewUpdateHandler>();
	let cleanedUp = false;
	let runtime: PreviewRuntime | null = null;
	const ready = import("./runtime.js")
		.then(({ setupPreviewRuntime }) => {
			if (cleanedUp) return;
			runtime = setupPreviewRuntime(mode, handlers);
		})
		.catch(() => undefined);

	const controller: PreviewController = {
		get active() {
			return !cleanedUp && (runtime?.active ?? false);
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
