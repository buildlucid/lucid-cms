/**
 * Builder/page protocol for readiness, updates and editing. The builder verifies window and origin
 * and applies requested changes. Pages read content with their preview token; only inline text
 * edits send content back. Invalid messages are ignored.
 */
export { previewProtocol, previewProtocolLimits } from "./constants.js";
export {
	createPreviewMessage,
	handlePreviewMessage,
	isPreviewBuilderMessage,
	isPreviewPageMessage,
} from "./messages.js";
export { toShownText } from "./text.js";
export type {
	PreviewBuilderMessages,
	PreviewDragged,
	PreviewEditing,
	PreviewHover,
	PreviewHoverBlock,
	PreviewItem,
	PreviewLanding,
	PreviewMessageHandlers,
	PreviewMessagePayload,
	PreviewPageMessages,
	PreviewPathSegment,
	PreviewPlace,
	PreviewRect,
	PreviewRepeater,
	PreviewScrollState,
	PreviewTarget,
	PreviewTargetBrick,
	PreviewTargetPath,
} from "./types.js";
export {
	arePreviewSiblings,
	decodePreviewTarget,
	getPreviewTargetKind,
	hasPreviewError,
	isPreviewItem,
	isSamePreviewTarget,
} from "./validators.js";
