import { getWindow } from "../utils/preview.js";
import { resolveToolbarAuthentication } from "./authentication.js";
import { bootstrapToolbar } from "./bootstrap.js";
import type {
	PreviewModeState,
	ToolbarContextState,
	ToolbarController,
	ToolbarOptions,
} from "./types.js";

const activeToolbarCleanups = new WeakMap<Window, () => void>();

const emptyPreview: PreviewModeState = {
	active: false,
	token: null,
	source: null,
	mode: null,
};
const emptyContext: ToolbarContextState = { builder: false };

const inactiveController = (
	preview: PreviewModeState = emptyPreview,
	context: ToolbarContextState = emptyContext,
): ToolbarController => ({
	active: false,
	element: null,
	preview,
	context,
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
	const bootstrap = bootstrapToolbar(targetWindow, options);
	if (bootstrap.context.builder) {
		return inactiveController(bootstrap.preview, bootstrap.context);
	}
	if (!bootstrap.preview.active && !bootstrap.editHref) {
		return inactiveController(bootstrap.preview, bootstrap.context);
	}

	let cleanedUp = false;
	let runtimeController: ToolbarController | null = null;

	const clearActiveCleanup = () => {
		if (activeToolbarCleanups.get(targetWindow) === cleanup) {
			activeToolbarCleanups.delete(targetWindow);
		}
	};
	const cleanup = () => {
		if (cleanedUp) return;
		cleanedUp = true;
		runtimeController?.cleanup();
		clearActiveCleanup();
	};

	activeToolbarCleanups.set(targetWindow, cleanup);
	const editAuthentication = bootstrap.editHref
		? resolveToolbarAuthentication(
				targetWindow,
				bootstrap.host,
				options.authentication,
			).catch(() => false)
		: Promise.resolve(false);

	const ready = (async () => {
		if (!bootstrap.preview.active && bootstrap.editHref) {
			const authenticated = await editAuthentication;
			if (!authenticated || cleanedUp) {
				clearActiveCleanup();
				return;
			}
		}

		const { setupToolbarRuntime } = await import("./runtime.js");
		if (cleanedUp) return;
		runtimeController = setupToolbarRuntime(
			options,
			bootstrap,
			editAuthentication,
		);
		await runtimeController.ready;
	})().catch(() => {
		clearActiveCleanup();
	});

	return {
		get active() {
			return !cleanedUp && (runtimeController?.active ?? false);
		},
		get element() {
			return cleanedUp ? null : (runtimeController?.element ?? null);
		},
		preview: bootstrap.preview,
		context: bootstrap.context,
		ready,
		exitPreview: async () => {
			await ready;
			await runtimeController?.exitPreview();
		},
		cleanup,
	};
};
