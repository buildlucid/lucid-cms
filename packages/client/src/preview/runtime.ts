import { getWindow, isLucidBuilderPreview } from "../utils/preview.js";
import { installPreviewBridge } from "./bridge.js";
import { resolvePreviewToken } from "./context.js";
import { installPreviewNavigation } from "./navigation.js";
import { createPreviewNotice } from "./notice.js";
import type { PreviewController, PreviewMode } from "./types.js";

const activePreviewCleanups = new WeakMap<Window, () => void>();

const inactiveController = (): PreviewController => ({
	active: false,
	ready: Promise.resolve(),
	cleanup: () => undefined,
});

/** Initializes Lucid's builder-only preview runtime. */
export const setupPreviewRuntime = (mode: PreviewMode): PreviewController => {
	const targetWindow = getWindow();
	if (!targetWindow || !isLucidBuilderPreview(targetWindow)) {
		return inactiveController();
	}

	activePreviewCleanups.get(targetWindow)?.();

	const token = resolvePreviewToken(targetWindow);
	const notice = mode === "exact" ? createPreviewNotice(targetWindow) : null;
	let cleanedUp = false;

	const cleanupNavigation = installPreviewNavigation({
		targetWindow,
		mode,
		token,
		showNavigationLocked: () => notice?.show(),
	});
	const cleanupBridge = installPreviewBridge(targetWindow);

	const cleanup = () => {
		if (cleanedUp) return;
		cleanedUp = true;
		cleanupNavigation();
		cleanupBridge();
		notice?.remove();
		activePreviewCleanups.delete(targetWindow);
	};

	activePreviewCleanups.set(targetWindow, cleanup);
	return {
		get active() {
			return !cleanedUp;
		},
		ready: Promise.resolve(),
		cleanup,
	};
};
