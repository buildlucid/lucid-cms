import {
	brickSlots,
	documentSidebarSlots,
	fieldSlots,
} from "virtual:lucid-admin";

/**
 * Preloads editor slots alongside route code to avoid layout shifts. Load failures are handled by
 * each slot's error boundary.
 */
const preloadDocumentSlots = () =>
	Promise.allSettled(
		[...fieldSlots, ...brickSlots, ...documentSidebarSlots].map((entry) =>
			entry.component.preload(),
		),
	);

export default preloadDocumentSlots;
