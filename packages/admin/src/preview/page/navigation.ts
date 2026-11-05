import { findLink, withoutPreviewParams } from "../links.js";

type PreviewNavigationOptions = {
	targetWindow: Window;
	/** Says a link wasn't followed, with where it goes when that's on the page's own site. */
	showNavigationLocked: (href: string | null) => void;
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
	return withoutPreviewParams(url);
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
		const anchor = findLink(options.targetWindow, event.target);
		if (!anchor) return;

		event.preventDefault();
		event.stopImmediatePropagation();
		if (isIntentionalNewTab(event)) {
			openSanitizedDestination(options.targetWindow, anchor);
			return;
		}
		const url = sanitizePreviewDestination(
			anchor.href,
			options.targetWindow.location.href,
		);
		options.showNavigationLocked(
			url?.origin === options.targetWindow.location.origin
				? url.toString()
				: null,
		);
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
