import type { PageMarkup } from "@lucidcms/client/markup";
import type { SiteState } from "../types.js";

export type PageMarkupState = PageMarkup & { footerWritten: boolean };

/** Keeps markup out of template-visible state. */
export const pageMarkup = new WeakMap<SiteState, PageMarkupState>();
