import type { SiteState } from "../types.js";

/** What previews add to a page's `<head>` and before its `</body>`. */
export type PageMarkup = { head: string; footer: string };

export type PageMarkupState = PageMarkup & { footerWritten: boolean };

/** Keeps markup out of template-visible state. */
export const pageMarkup = new WeakMap<SiteState, PageMarkupState>();
