import type { PreviewRuntimeState } from "@lucidcms/types";
import {
	previewContextQueryParam,
	previewQueryParam,
} from "../utils/preview.js";
import { toolbarTagName } from "./constants.js";

type PreviewNavigationOptions = {
	targetWindow: Window;
	preview: PreviewRuntimeState;
	propagateInternalLinks: boolean;
};

const findAnchor = (
	targetWindow: Window,
	target: EventTarget | null,
): HTMLAnchorElement | null => {
	const WindowElement = (targetWindow as Window & typeof globalThis).Element;
	if (!(target instanceof WindowElement)) return null;
	return (target as Element).closest<HTMLAnchorElement>("a[href]");
};

const isSupportedNavigationUrl = (url: URL): boolean =>
	url.protocol === "http:" || url.protocol === "https:";

/** Installs top-level preview continuity and returns its cleanup function. */
export const installToolbarNavigation = (
	options: PreviewNavigationOptions,
): (() => void) => {
	const { targetWindow, preview } = options;
	if (preview.kind === "published") return () => undefined;

	const onNavigate = (event: MouseEvent) => {
		if (event.type === "click" && event.button !== 0) return;
		if (event.type === "auxclick" && event.button !== 1) return;
		const anchor = findAnchor(targetWindow, event.target);
		if (!anchor || anchor.closest(toolbarTagName)) return;

		let url: URL;
		try {
			url = new URL(anchor.href, targetWindow.location.href);
		} catch {
			return;
		}
		if (!isSupportedNavigationUrl(url)) return;

		if (url.origin !== targetWindow.location.origin) {
			url.searchParams.delete(previewQueryParam);
			url.searchParams.delete(previewContextQueryParam);
			anchor.href = url.toString();
			anchor.referrerPolicy = "no-referrer";
			return;
		}

		if (
			preview.mode === "perspective" &&
			options.propagateInternalLinks &&
			!anchor.hasAttribute("download")
		) {
			url.searchParams.set(previewQueryParam, preview.token);
			url.searchParams.delete(previewContextQueryParam);
		} else {
			url.searchParams.delete(previewQueryParam);
			url.searchParams.delete(previewContextQueryParam);
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
