import { previewQueryParam } from "../utils/preview.js";
import { previewExitValue } from "./constants.js";
import {
	clearStoredToken,
	detectPreviewMode,
	detectToolbarContext,
	stripPreviewQuery,
} from "./context.js";
import { getToolbarAdminUrl, resolveToolbarHost } from "./host.js";
import { buildToolbarEditHref } from "./links.js";
import type {
	PreviewModeState,
	ToolbarContextState,
	ToolbarOptions,
	ToolbarPreviewOptions,
} from "./types.js";

export type ToolbarBootstrap = {
	targetWindow: Window;
	context: ToolbarContextState;
	preview: PreviewModeState;
	previewOptions: ToolbarPreviewOptions | undefined;
	host: URL;
	adminUrl: URL;
	editHref: string | null;
};

/** Resolves cheap toolbar state before the full UI runtime is loaded. */
export const bootstrapToolbar = (
	targetWindow: Window,
	options: ToolbarOptions,
): ToolbarBootstrap => {
	const context = detectToolbarContext(targetWindow);
	if (context.builder) {
		const host = new URL(targetWindow.location.origin);
		return {
			targetWindow,
			context,
			preview: { active: false, token: null, source: null, mode: null },
			previewOptions: undefined,
			host,
			adminUrl: getToolbarAdminUrl(host),
			editHref: null,
		};
	}

	const currentUrl = new URL(targetWindow.location.href);
	const exitRequested =
		currentUrl.searchParams.get(previewQueryParam) === previewExitValue;

	if (exitRequested || options.preview === false) {
		clearStoredToken(targetWindow);
		if (currentUrl.searchParams.has(previewQueryParam)) {
			stripPreviewQuery(targetWindow);
		}
	}

	const preview: PreviewModeState =
		options.preview === false
			? { active: false, token: null, source: null, mode: null }
			: detectPreviewMode(
					targetWindow,
					options.preview?.token,
					options.preview?.mode,
				);
	const host = resolveToolbarHost(targetWindow, options.host);

	return {
		targetWindow,
		context,
		preview,
		previewOptions: options.preview === false ? undefined : options.preview,
		host,
		adminUrl: getToolbarAdminUrl(host),
		editHref: options.edit ? buildToolbarEditHref(options.edit, host) : null,
	};
};
