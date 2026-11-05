import { previewScripts } from "@lucidcms/client/contract";
import type { PreviewPageScript } from "@lucidcms/types";
import { setupPreviewPage } from "./runtime.js";

/**
 * The preview page script the CMS serves at `/admin/preview.js`. `setupPreview` from
 * `@lucidcms/client` loads it into the builder's preview frame and starts it.
 */
const script: PreviewPageScript = { version: 1, setup: setupPreviewPage };
Object.defineProperty(window, previewScripts.page.key, {
	value: script,
	configurable: true,
});
