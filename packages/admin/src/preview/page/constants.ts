export const previewOverlayTagName = "lucid-preview-overlay";

/** Elements with this attribute are left alone when a preview update morphs the page. */
export const previewKeepAttribute = "data-lucid-preview-keep";

/** Where the page script puts itself on `window`, for `@lucidcms/client`'s `setupPreview` to find. */
export const previewPageScriptKey = Symbol.for("lucid.preview-page");
