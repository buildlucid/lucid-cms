import type {
	PreviewPageOptions,
	PreviewPageRuntime,
	PreviewUpdateHandler,
} from "@lucidcms/types";
import { isLucidBuilderPreview } from "../protocol/index.js";
import { installPreviewBridge } from "./bridge.js";
import { createMorphHandler } from "./morph-handler.js";
import { installPreviewNavigation } from "./navigation.js";
import { createPreviewNotice } from "./notice.js";

let cleanupActive: (() => void) | null = null;

/**
 * Starts the preview runtime in the builder's preview frame, replacing any already running.
 * Returns null anywhere else.
 */
export const setupPreviewPage = (
	options: PreviewPageOptions,
): PreviewPageRuntime | null => {
	if (!isLucidBuilderPreview(window)) return null;
	cleanupActive?.();

	const morph = options.morph ? createMorphHandler(options.serverMarkup) : null;
	const handlers = (): PreviewUpdateHandler[] =>
		morph ? [morph, ...options.handlers] : [...options.handlers];
	const notice = createPreviewNotice(window);
	const bridge = installPreviewBridge(window, handlers);
	const cleanupNavigation = installPreviewNavigation({
		targetWindow: window,
		showNavigationLocked: () => notice.show(),
	});

	const cleanup = () => {
		if (cleanupActive !== cleanup) return;
		cleanupActive = null;
		cleanupNavigation();
		bridge.cleanup();
		notice.remove();
	};
	cleanupActive = cleanup;
	return {
		handlersChanged: () => {
			if (cleanupActive === cleanup) bridge.handlersChanged();
		},
		cleanup,
	};
};
