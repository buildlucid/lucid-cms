import { previewParams } from "@lucidcms/client/contract";

/** The link a click landed in, read with the page's own `Element`, as the page may be a frame. */
export const findLink = (
	targetWindow: Window,
	target: EventTarget | null,
): HTMLAnchorElement | null => {
	const WindowElement = (targetWindow as Window & typeof globalThis).Element;
	if (!(target instanceof WindowElement)) return null;
	return target.closest<HTMLAnchorElement>("a[href]");
};

/** Takes the preview's parameters off a URL, so it leaves the preview. */
export const withoutPreviewParams = (url: URL) => {
	url.searchParams.delete(previewParams.token);
	url.searchParams.delete(previewParams.context);
	return url;
};
