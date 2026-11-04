import type { PreviewMode } from "@lucidcms/types";

export const previewProtocol = {
	scope: "lucid:builder-preview",
	version: 1,
	messages: {
		ready: "ready",
		connect: "connect",
		captureScroll: "capture-scroll",
		scrollState: "scroll-state",
		restoreScroll: "restore-scroll",
		focusField: "focus-field",
		deselect: "deselect",
		update: "update",
		rendered: "rendered",
		unload: "unload",
		editMode: "edit-mode",
		highlightField: "highlight-field",
		move: "move",
		hover: "hover",
		drag: "drag",
		dragEnd: "drag-end",
	},
} as const;

/** The names the builder gives its preview frame, saying the preview's mode. */
export const previewFrameNames = {
	perspective: "lucid-builder-preview:perspective",
	scoped: "lucid-builder-preview:scoped",
} as const satisfies Record<PreviewMode, string>;

/** The query parameters the builder adds to the URL its preview frame loads. */
export const previewQueryParams = {
	token: "preview",
	context: "previewContext",
} as const;
export const builderPreviewContext = "builder";

//* the markup `@lucidcms/client` writes, which has to match: its attribute, and a version prefix before the encoded target
export const previewFieldAttribute = "data-lucid-preview-field" as const;
export const previewFieldAttributePrefix = "1:";

export const previewProtocolLimits = {
	attributeLength: 4096,
	pageKeyLength: 2048,
	requestIdLength: 128,
	collectionKeyLength: 128,
	brickKeyLength: 128,
	brickRefLength: 128,
	localeLength: 64,
	pathDepth: 32,
	pathKeyLength: 128,
	repeaters: 4096,
	errors: 4096,
} as const;
