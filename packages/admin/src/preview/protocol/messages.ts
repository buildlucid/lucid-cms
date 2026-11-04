import { previewProtocol, previewProtocolLimits } from "./constants.js";
import type {
	PreviewChildMessage,
	PreviewEnvelope,
	PreviewMessagePayload,
	PreviewParentMessage,
} from "./types.js";
import {
	hasOnlyKeys,
	isBoundedString,
	isFiniteNumber,
	isRecord,
} from "./utils/validation.js";
import {
	arePreviewSiblings,
	getPreviewTargetKind,
	isPreviewEditing,
	isPreviewFieldTarget,
	isPreviewHover,
	isPreviewPlace,
	isPreviewScrollState,
} from "./validators.js";

/** Checks the shared scope and version before handling a message. */
const hasEnvelope = (value: unknown): value is Record<string, unknown> =>
	isRecord(value) &&
	value.scope === previewProtocol.scope &&
	value.version === previewProtocol.version;

/** Bounds request IDs used to pair scroll capture replies. */
const isRequestId = (value: unknown): value is string =>
	isBoundedString(value, previewProtocolLimits.requestIdLength);

/** Revisions only rise within one preview, from zero. */
const isRevision = (value: unknown): value is number =>
	typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

/** Validates messages sent from the preview child to the builder parent. */
export const isPreviewChildMessage = (
	value: unknown,
): value is PreviewChildMessage => {
	if (!hasEnvelope(value)) return false;

	switch (value.type) {
		case previewProtocol.messages.ready:
			return (
				hasOnlyKeys(value, [
					"scope",
					"version",
					"type",
					"updates",
					"loadedAt",
				]) &&
				typeof value.updates === "boolean" &&
				isFiniteNumber(value.loadedAt)
			);
		case previewProtocol.messages.unload:
		case previewProtocol.messages.deselect:
		case previewProtocol.messages.navigationLocked:
			return hasOnlyKeys(value, ["scope", "version", "type"]);
		case previewProtocol.messages.rendered:
			return (
				hasOnlyKeys(value, ["scope", "version", "type", "revision"]) &&
				isRevision(value.revision)
			);
		case previewProtocol.messages.scrollState:
			return (
				hasOnlyKeys(value, [
					"scope",
					"version",
					"type",
					"requestId",
					"state",
				]) &&
				isRequestId(value.requestId) &&
				isPreviewScrollState(value.state)
			);
		case previewProtocol.messages.focusField:
			return (
				hasOnlyKeys(value, ["scope", "version", "type", "target"]) &&
				isPreviewFieldTarget(value.target)
			);
		case previewProtocol.messages.move:
			return (
				hasOnlyKeys(value, [
					"scope",
					"version",
					"type",
					"target",
					"place",
					"anchor",
				]) &&
				isPreviewFieldTarget(value.target) &&
				isPreviewPlace(value.place) &&
				isPreviewFieldTarget(value.anchor) &&
				arePreviewSiblings(value.target, value.anchor)
			);
		case previewProtocol.messages.hover:
			return (
				hasOnlyKeys(value, ["scope", "version", "type", "hover"]) &&
				isPreviewHover(value.hover)
			);
		default:
			return false;
	}
};

/** Validates messages sent from the builder parent to the preview child. */
export const isPreviewParentMessage = (
	value: unknown,
): value is PreviewParentMessage => {
	if (!hasEnvelope(value)) return false;

	switch (value.type) {
		case previewProtocol.messages.connect:
			return hasOnlyKeys(value, ["scope", "version", "type"]);
		case previewProtocol.messages.captureScroll:
			return (
				hasOnlyKeys(value, ["scope", "version", "type", "requestId"]) &&
				isRequestId(value.requestId)
			);
		case previewProtocol.messages.restoreScroll:
			return (
				hasOnlyKeys(value, ["scope", "version", "type", "state"]) &&
				isPreviewScrollState(value.state)
			);
		case previewProtocol.messages.update:
			return (
				hasOnlyKeys(value, ["scope", "version", "type", "revision"]) &&
				isRevision(value.revision)
			);
		case previewProtocol.messages.editMode:
			return (
				hasOnlyKeys(value, ["scope", "version", "type", "editing"]) &&
				(value.editing === null || isPreviewEditing(value.editing))
			);
		case previewProtocol.messages.highlightField:
			return (
				hasOnlyKeys(value, ["scope", "version", "type", "target"]) &&
				isPreviewFieldTarget(value.target)
			);
		case previewProtocol.messages.drag:
			return (
				hasOnlyKeys(value, ["scope", "version", "type", "target", "x", "y"]) &&
				isPreviewFieldTarget(value.target) &&
				getPreviewTargetKind(value.target) !== "field" &&
				isFiniteNumber(value.x) &&
				isFiniteNumber(value.y)
			);
		case previewProtocol.messages.dragEnd:
			return (
				hasOnlyKeys(value, ["scope", "version", "type", "drop"]) &&
				typeof value.drop === "boolean"
			);
		default:
			return false;
	}
};

/** Adds the current protocol envelope to an outgoing message payload. */
export const createPreviewMessage = <TPayload extends PreviewMessagePayload>(
	payload: TPayload,
): PreviewEnvelope & TPayload => ({
	scope: previewProtocol.scope,
	version: previewProtocol.version,
	...payload,
});
