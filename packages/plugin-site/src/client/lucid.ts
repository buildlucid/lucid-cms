/** Browser entry for site previews: the Lucid toolbar, and the builder preview runtime, which morphs the server-rendered page in place when its content changes. */
import { morphPage, setupPreview } from "@lucidcms/client/preview";
import { LucidToolbarElement } from "@lucidcms/client/toolbar";

setupPreview().onUpdate(morphPage);

if (!customElements.get(LucidToolbarElement.tagName)) {
	customElements.define(LucidToolbarElement.tagName, LucidToolbarElement);
}
