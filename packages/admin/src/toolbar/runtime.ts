import type { PreviewRuntimeState } from "@lucidcms/types";
import { createToolbarElement } from "./element.js";
import { installToolbarNavigation } from "./navigation.js";

export type ToolbarRuntimeModel = {
	adminHref: string;
	preview: PreviewRuntimeState;
	edit: { href: string; label: string } | null;
	propagateInternalLinks: boolean;
	exitPreview: () => Promise<void>;
};

export type ToolbarRuntime = {
	readonly active: boolean;
	update: (model: ToolbarRuntimeModel) => void;
	cleanup: () => void;
};

/** Owns the toolbar DOM and browser navigation listeners. */
export const setupToolbarRuntime = (targetWindow: Window): ToolbarRuntime => {
	const element = createToolbarElement(targetWindow);
	let cleanedUp = false;
	let cleanupNavigation: () => void = () => undefined;

	const cleanup = () => {
		if (cleanedUp) return;
		cleanedUp = true;
		cleanupNavigation();
		element.remove();
	};

	return {
		get active() {
			return !cleanedUp && element.isConnected && !element.hidden;
		},
		update: (model) => {
			if (cleanedUp) return;
			cleanupNavigation();
			cleanupNavigation = installToolbarNavigation({
				targetWindow,
				preview: model.preview,
				propagateInternalLinks: model.propagateInternalLinks,
			});
			element.setModel({
				adminHref: model.adminHref,
				previewMode:
					model.preview.kind === "preview" ? model.preview.mode : null,
				edit: model.edit,
				exitPreview:
					model.preview.kind === "preview" ? model.exitPreview : null,
			});
			element.hidden =
				model.preview.kind === "published" && model.edit === null;
		},
		cleanup,
	};
};
