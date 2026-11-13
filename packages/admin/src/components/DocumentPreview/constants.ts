/** The preview toolbar's built-in items, start to end. Plugin items go before or after one. */
export const previewToolbarItems = [
	"width",
	"zoom",
	"edit",
	"refresh",
	"open",
] as const;

/** Built-in items that size the page, which a divider keeps apart from the rest. */
export const previewToolbarViewItems = [
	"width",
	"zoom",
] as const satisfies ReadonlyArray<(typeof previewToolbarItems)[number]>;

/** Slots that replace the document preview or add to its toolbar. */
export const documentPreviewSlotPolicies = {
	"document.preview": {
		surface: "documentPreview",
		multiple: false,
		group: "document.preview",
	},
	"document.previewToolbar": {
		surface: "documentPreview",
		multiple: true,
		group: "document.previewToolbar",
	},
} as const;
