/** Browser entry for site previews: the Lucid toolbar, and the builder preview, which morphs the server-rendered page in place when its content changes. */
import { LucidToolbarElement } from "@lucidcms/admin/toolbar";
import { setupPreview } from "@lucidcms/client/preview";

setupPreview({ morph: true });

if (!customElements.get(LucidToolbarElement.tagName)) {
	customElements.define(LucidToolbarElement.tagName, LucidToolbarElement);
}
