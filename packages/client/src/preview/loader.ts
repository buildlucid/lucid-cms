import { getBuilderPreviewMode, getWindow } from "../utils/preview.js";
import type { PreviewController } from "./types.js";

const inactiveController = (): PreviewController => ({
	active: false,
	ready: Promise.resolve(),
	cleanup: () => undefined,
});

/** Lazily initializes Lucid's runtime inside its builder preview iframe. */
export const setupPreview = (): PreviewController => {
	const targetWindow = getWindow();
	if (!targetWindow) return inactiveController();
	const mode = getBuilderPreviewMode(targetWindow);
	if (!mode) return inactiveController();

	let cleanedUp = false;
	let runtimeController: PreviewController | null = null;
	const ready = import("./runtime.js")
		.then(({ setupPreviewRuntime }) => {
			if (cleanedUp) return;
			runtimeController = setupPreviewRuntime(mode);
		})
		.catch(() => undefined);

	return {
		get active() {
			return !cleanedUp && (runtimeController?.active ?? false);
		},
		ready,
		cleanup: () => {
			if (cleanedUp) return;
			cleanedUp = true;
			runtimeController?.cleanup();
		},
	};
};
