/**
 * The preview page script the CMS serves at `/admin/preview.js`. `setupPreview` from
 * `@lucidcms/client` loads it into the builder's preview frame and starts it.
 */
import type { PreviewPageScript } from "@lucidcms/types";
import { previewPageScriptKey } from "./constants.js";
import { setupPreviewPage } from "./runtime.js";

const script: PreviewPageScript = { version: 1, setup: setupPreviewPage };
Object.defineProperty(window, previewPageScriptKey, {
	value: script,
	configurable: true,
});
