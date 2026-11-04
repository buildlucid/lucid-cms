import { previewQueryParams } from "../protocol/index.js";
import { previewNoticeTagName } from "./constants.js";

type PreviewNavigationOptions = {
	targetWindow: Window;
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

const isIntentionalNewTab = (event: MouseEvent): boolean =>
	event.button === 1 || event.metaKey || event.ctrlKey;

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
	if (url.protocol !== "http:" && url.protocol !== "https:") return null;
	url.searchParams.delete(previewQueryParams.token);
	url.searchParams.delete(previewQueryParams.context);
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

/**
 * Keeps the builder's preview on the page being edited: links don't navigate, and Ctrl/Cmd-click
 * or middle-click opens their published destination in a new tab instead.
 */
export const installPreviewNavigation = (
	options: PreviewNavigationOptions,
): (() => void) => {
	const onNavigate = (event: MouseEvent) => {
		if (event.type === "click" && event.button !== 0) return;
		if (event.type === "auxclick" && event.button !== 1) return;
		const anchor = findAnchor(options.targetWindow, event.target);
		if (!anchor || anchor.closest(previewNoticeTagName)) return;

		event.preventDefault();
		event.stopImmediatePropagation();
		if (isIntentionalNewTab(event)) {
			openSanitizedDestination(options.targetWindow, anchor);
		} else {
			options.showNavigationLocked();
		}
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
