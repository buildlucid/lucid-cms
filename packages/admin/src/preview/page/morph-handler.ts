import type { PreviewUpdateHandler } from "@lucidcms/types";
import { morphDocument } from "./morph.js";
import type { ServerMarkup } from "./server-markup.js";

/** Parses a page, attaching declarative shadow roots where the browser can. */
const parsePage = (html: string) =>
	typeof Document.parseHTMLUnsafe === "function"
		? Document.parseHTMLUnsafe(html)
		: new DOMParser().parseFromString(html, "text/html");

/**
 * Refreshes a server-rendered page in place by fetching it again. Keeps scroll and
 * `data-lucid-keep` elements, and replaces custom elements when their server markup changes.
 */
export const createMorphHandler =
	(markup: ServerMarkup): PreviewUpdateHandler =>
	async ({ signal }) => {
		const response = await fetch(window.location.href, {
			credentials: "same-origin",
			cache: "no-store",
			headers: { accept: "text/html" },
			signal,
		});
		if (!response.ok) {
			throw new Error(`Preview update failed with status ${response.status}`);
		}

		const html = await response.text();
		if (signal.aborted) return;
		morphDocument(document, parsePage(html), markup);
	};
