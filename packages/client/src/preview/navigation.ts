import { previewQueryParam } from "../utils/preview.js";
import { previewNoticeTagName } from "./constants.js";
import type { PreviewMode } from "./types.js";

type PreviewNavigationOptions = {
	targetWindow: Window;
	mode: PreviewMode;
	token: string | null;
	showNavigationLocked: () => void;
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

/** Removes preview credentials from a destination. */
const sanitizePreviewDestination = (
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

export const installPreviewNavigation = (
	options: PreviewNavigationOptions,
): (() => void) => {
	const onNavigate = (event: MouseEvent) => {
		if (event.type === "click" && event.button !== 0) return;
		if (event.type === "auxclick" && event.button !== 1) return;
		const anchor = findAnchor(options.targetWindow, event.target);
		if (!anchor || anchor.closest(previewNoticeTagName)) return;

		if (options.mode === "scoped") {
			event.preventDefault();
			event.stopImmediatePropagation();
			if (isIntentionalNewTab(event)) {
				openSanitizedDestination(options.targetWindow, anchor);
			} else {
				options.showNavigationLocked();
			}
			return;
		}

		let url: URL;
		try {
			url = new URL(anchor.href, options.targetWindow.location.href);
		} catch {
			return;
		}
		if (!isSupportedNavigationUrl(url)) return;

		if (url.origin !== options.targetWindow.location.origin) {
			url.searchParams.delete(previewQueryParam);
			anchor.href = url.toString();
			anchor.referrerPolicy = "no-referrer";
			return;
		}

		if (options.token && !anchor.hasAttribute("download")) {
			url.searchParams.set(previewQueryParam, options.token);
		} else {
			url.searchParams.delete(previewQueryParam);
		}
		anchor.href = url.toString();
	};

	options.targetWindow.document.addEventListener("click", onNavigate, true);
	options.targetWindow.document.addEventListener("auxclick", onNavigate, true);
	return () => {
		options.targetWindow.document.removeEventListener(
			"click",
			onNavigate,
			true,
		);
		options.targetWindow.document.removeEventListener(
			"auxclick",
			onNavigate,
			true,
		);
	};
};
