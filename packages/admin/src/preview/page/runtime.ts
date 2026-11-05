import { isBuilderPreviewFrame } from "@lucidcms/client/contract";
import type {
	PreviewPageOptions,
	PreviewPageRuntime,
	PreviewUpdateHandler,
} from "@lucidcms/types";
import { installPreviewBridge } from "./bridge.js";
import { createMorphHandler } from "./morph-handler.js";
import { installPreviewNavigation } from "./navigation.js";

let cleanupActive: (() => void) | null = null;

/**
 * Starts the preview runtime in the builder's preview frame, replacing any already running.
 * Returns null anywhere else.
 */
export const setupPreviewPage = (
	options: PreviewPageOptions,
): PreviewPageRuntime | null => {
	if (!isBuilderPreviewFrame(window)) return null;
	cleanupActive?.();

	const morph = options.morph ? createMorphHandler(options.serverMarkup) : null;
	const handlers = (): PreviewUpdateHandler[] =>
		morph ? [morph, ...options.handlers] : [...options.handlers];
	const bridge = installPreviewBridge(window, handlers);
	const cleanupNavigation = installPreviewNavigation({
		targetWindow: window,
		showNavigationLocked: bridge.navigationLocked,
	});

	const cleanup = () => {
		if (cleanupActive !== cleanup) return;
		cleanupActive = null;
		cleanupNavigation();
		bridge.cleanup();
	};
	cleanupActive = cleanup;
	return {
		handlersChanged: () => {
			if (cleanupActive === cleanup) bridge.handlersChanged();
		},
		cleanup,
	};
};
