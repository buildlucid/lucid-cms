import { previewQueryParam, toolbarTagName } from "./constants.js";
import type { LucidToolbarElement } from "./element.js";
import type { PreviewModeState } from "./types.js";

type PreviewNavigationOptions = {
	targetWindow: Window;
	toolbar: LucidToolbarElement;
	preview: PreviewModeState;
	builder: boolean;
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

const isIntentionalNewTab = (event: MouseEvent): boolean =>
	event.button === 1 ||
	event.metaKey ||
	event.ctrlKey ||
	event.shiftKey ||
	event.altKey;

/** Removes all preview credentials from a destination before it leaves the frame. */
export const sanitizePreviewDestination = (
	href: string,
	baseUrl: string | URL,
): URL | null => {
	let url: URL;
	try {
		url = new URL(href, baseUrl);
	} catch {
		return null;
	}
	if (!isSupportedNavigationUrl(url)) return null;
	url.searchParams.delete(previewQueryParam);
	return url;
};

const openSanitizedDestination = (
	targetWindow: Window,
	anchor: HTMLAnchorElement,
): void => {
	const url = sanitizePreviewDestination(
		anchor.href,
		targetWindow.location.href,
	);
	if (!url) return;
	const opened = targetWindow.open(
		url.toString(),
		"_blank",
		"noopener,noreferrer",
	);
	if (opened) opened.opener = null;
};

/** Installs preview link handling and returns its cleanup function. */
export const installPreviewNavigation = (
	options: PreviewNavigationOptions,
): (() => void) => {
	const { targetWindow, toolbar, preview } = options;
	if (!preview.active || !preview.token) return () => undefined;
	const previewToken = preview.token;

	const onNavigate = (event: MouseEvent) => {
		if (event.type === "click" && event.button !== 0) return;
		if (event.type === "auxclick" && event.button !== 1) return;
		const anchor = findAnchor(targetWindow, event.target);
		if (!anchor || anchor.closest(toolbarTagName)) return;

		const exactBuilderPreview = options.builder && preview.mode === "exact";
		if (exactBuilderPreview) {
			event.preventDefault();
			event.stopImmediatePropagation();
			if (isIntentionalNewTab(event)) {
				openSanitizedDestination(targetWindow, anchor);
			} else {
				toolbar.showNavigationLocked();
			}
			return;
		}

		let url: URL;
		try {
			url = new URL(anchor.href, targetWindow.location.href);
		} catch {
			return;
		}
		if (!isSupportedNavigationUrl(url)) return;

		if (url.origin !== targetWindow.location.origin) {
			if (url.searchParams.has(previewQueryParam)) {
				url.searchParams.delete(previewQueryParam);
				anchor.href = url.toString();
			}
			anchor.referrerPolicy = "no-referrer";
			return;
		}

		if (!options.propagateInternalLinks || anchor.hasAttribute("download")) {
			return;
		}
		url.searchParams.set(previewQueryParam, previewToken);
		anchor.href = url.toString();
	};

	targetWindow.document.addEventListener("click", onNavigate, true);
	targetWindow.document.addEventListener("auxclick", onNavigate, true);
	return () => {
		targetWindow.document.removeEventListener("click", onNavigate, true);
		targetWindow.document.removeEventListener("auxclick", onNavigate, true);
	};
};
