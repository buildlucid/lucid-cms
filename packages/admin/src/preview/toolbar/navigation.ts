import { previewParams } from "@lucidcms/client/contract";
import type { PreviewMode } from "@lucidcms/types";
import { findLink, withoutPreviewParams } from "../links.js";
import { toolbarTagName } from "./constants.js";

const isSupportedNavigationUrl = (url: URL): boolean =>
	url.protocol === "http:" || url.protocol === "https:";

/**
 * Keeps a navigable preview on the site's own links and takes the token off links that leave the
 * preview: scoped previews' links, and links to other sites. Returns its cleanup function.
 */
export const installToolbarNavigation = (
	targetWindow: Window,
	preview: { mode: PreviewMode; token: string },
): (() => void) => {
	const onNavigate = (event: MouseEvent) => {
		if (event.type === "click" && event.button !== 0) return;
		if (event.type === "auxclick" && event.button !== 1) return;
		const anchor = findLink(targetWindow, event.target);
		if (!anchor || anchor.closest(toolbarTagName)) return;

		let url: URL;
		try {
			url = new URL(anchor.href, targetWindow.location.href);
		} catch {
			return;
		}
		if (!isSupportedNavigationUrl(url)) return;

		withoutPreviewParams(url);
		if (url.origin !== targetWindow.location.origin) {
			anchor.href = url.toString();
			anchor.referrerPolicy = "no-referrer";
			return;
		}
		if (preview.mode === "navigable" && !anchor.hasAttribute("download")) {
			url.searchParams.set(previewParams.token, preview.token);
		}
		anchor.href = url.toString();
	};

	targetWindow.document.addEventListener("click", onNavigate, true);
	targetWindow.document.addEventListener("auxclick", onNavigate, true);
	return () => {
		targetWindow.document.removeEventListener("click", onNavigate, true);
		targetWindow.document.removeEventListener("auxclick", onNavigate, true);
	};
};
