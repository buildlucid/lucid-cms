/** Browser entry point for live preview and the Lucid toolbar. */
import { setupPreview } from "./preview/loader.js";
import { LucidToolbarElement } from "./toolbar/declarative.js";

setupPreview();

if (!customElements.get(LucidToolbarElement.tagName)) {
	customElements.define(LucidToolbarElement.tagName, LucidToolbarElement);
}
