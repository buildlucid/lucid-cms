export const previewNoticeTagName = "lucid-preview-notice";
export const previewOverlayTagName = "lucid-preview-overlay";

export const navigationLockedMessage =
	"Links don't open in the builder's preview. Use Ctrl/Cmd-click or middle-click to open the published page in a new tab.";

/** Elements with this attribute are left alone when a preview update morphs the page. */
export const previewKeepAttribute = "data-lucid-preview-keep";

/** Where the page script puts itself on `window`, for `@lucidcms/client`'s `setupPreview` to find. */
export const previewPageScriptKey = Symbol.for("lucid.preview-page");
