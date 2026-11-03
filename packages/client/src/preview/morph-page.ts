import { getWindow, isLucidBuilderPreview } from "../utils/preview.js";
import { recordServerMarkup } from "./server-markup.js";
import type { PreviewUpdateHandler } from "./types.js";

//* the page's custom elements are noted before they hydrate, so the first update compares them with what the server sent
const targetWindow = getWindow();
if (targetWindow && isLucidBuilderPreview(targetWindow)) {
	const { document } = targetWindow;
	const record = () => recordServerMarkup(document.body);
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", record, { once: true });
	} else {
		record();
	}
}

/** Parses a page, attaching declarative shadow roots where the browser can. */
const parsePage = (html: string) =>
	typeof Document.parseHTMLUnsafe === "function"
		? Document.parseHTMLUnsafe(html)
		: new DOMParser().parseFromString(html, "text/html");

/**
 * Register with `onUpdate` to refresh server-rendered pages in place. Preserves scroll and
 * `data-lucid-preview-keep` elements; replaces custom elements when their server markup changes.
 */
export const morphPage: PreviewUpdateHandler = async ({ signal }) => {
	const [{ morphDocument }, response] = await Promise.all([
		import("./morph.js"),
		fetch(window.location.href, {
			credentials: "same-origin",
			cache: "no-store",
			headers: { accept: "text/html" },
			signal,
		}),
	]);
	if (!response.ok) {
		throw new Error(`Preview update failed with status ${response.status}`);
	}

	const html = await response.text();
	if (signal.aborted) return;
	morphDocument(document, parsePage(html));
};
