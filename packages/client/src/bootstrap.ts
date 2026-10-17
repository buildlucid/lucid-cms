/** Browser entry point for live preview and the Lucid toolbar. */
import { setupPreview } from "./preview/loader.js";
import { LucidToolbarElement } from "./toolbar/declarative.js";

const preview = setupPreview();
window.addEventListener("pagehide", preview.cleanup, { once: true });

if (!customElements.get(LucidToolbarElement.tagName)) {
	customElements.define(LucidToolbarElement.tagName, LucidToolbarElement);
}
