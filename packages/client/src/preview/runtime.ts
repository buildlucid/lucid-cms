import { getWindow, isLucidBuilderPreview } from "../utils/preview.js";
import { installPreviewBridge } from "./bridge.js";
import { resolvePreviewToken } from "./context.js";
import { installPreviewNavigation } from "./navigation.js";
import { createPreviewNotice } from "./notice.js";
import type { PreviewMode, PreviewUpdateHandler } from "./types.js";

/** The lazily loaded part of a preview controller. */
export type PreviewRuntime = {
	readonly active: boolean;
	/** Tells the builder whether the page now has update handlers. */
	handlersChanged: () => void;
	cleanup: () => void;
};

const activePreviewCleanups = new WeakMap<Window, () => void>();

/** Initializes Lucid's builder-only preview runtime, running `handlers` when the previewed content changes. */
export const setupPreviewRuntime = (
	mode: PreviewMode,
	handlers: ReadonlySet<PreviewUpdateHandler>,
): PreviewRuntime => {
	const targetWindow = getWindow();
	if (!targetWindow || !isLucidBuilderPreview(targetWindow)) {
		return {
			active: false,
			handlersChanged: () => undefined,
			cleanup: () => undefined,
		};
	}

	activePreviewCleanups.get(targetWindow)?.();

	const token = resolvePreviewToken(targetWindow);
	const notice = mode === "scoped" ? createPreviewNotice(targetWindow) : null;
	let cleanedUp = false;

	const bridge = installPreviewBridge(targetWindow, handlers);
	const cleanupNavigation = installPreviewNavigation({
		targetWindow,
		mode,
		token,
		showNavigationLocked: () => notice?.show(),
	});

	const cleanup = () => {
		if (cleanedUp) return;
		cleanedUp = true;
		cleanupNavigation();
		bridge.cleanup();
		notice?.remove();
		activePreviewCleanups.delete(targetWindow);
	};

	activePreviewCleanups.set(targetWindow, cleanup);
	return {
		get active() {
			return !cleanedUp;
		},
		handlersChanged: bridge.handlersChanged,
		cleanup,
	};
};
