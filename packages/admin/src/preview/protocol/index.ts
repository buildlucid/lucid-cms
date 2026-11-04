/**
 * Builder/page messaging protocol. The page announces readiness, handler changes and unloading;
 * the builder verifies its window and origin. Updates re-render or reload the page, which reads
 * content using its preview token. Edit mode exchanges pointer targets, focus and drag requests;
 * the builder applies changes. Field markup is written by `@lucidcms/client`. Invalid messages are
 * ignored.
 */
export {
	builderPreviewContext,
	previewFieldAttribute,
	previewFrameNames,
	previewProtocol,
	previewProtocolLimits,
	previewQueryParams,
} from "./constants.js";
export { decodePreviewFieldTarget } from "./field-target.js";
export { isLucidBuilderPreview, normalizePreviewToken } from "./frame.js";
export {
	createPreviewMessage,
	isPreviewChildMessage,
	isPreviewParentMessage,
} from "./messages.js";
export type {
	PreviewEditing,
	PreviewFieldPath,
	PreviewFieldTarget,
	PreviewHover,
	PreviewHoverBlock,
	PreviewPlace,
	PreviewRect,
	PreviewRepeater,
	PreviewScrollState,
} from "./types.js";
export {
	arePreviewSiblings,
	getPreviewTargetKind,
	hasPreviewError,
	isSamePreviewTarget,
} from "./validators.js";
