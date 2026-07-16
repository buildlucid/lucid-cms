import { previewProtocol, previewProtocolLimits } from "./constants.js";
import type {
	PreviewChildMessage,
	PreviewEnvelope,
	PreviewMessagePayload,
	PreviewParentMessage,
} from "./types.js";
import { hasOnlyKeys, isBoundedString, isRecord } from "./utils/validation.js";
import { isPreviewFieldTarget, isPreviewScrollState } from "./validators.js";

/** Checks the shared scope and version before handling a message. */
const hasEnvelope = (value: unknown): value is Record<string, unknown> =>
	isRecord(value) &&
	value.scope === previewProtocol.scope &&
	value.version === previewProtocol.version;

/** Bounds request IDs used to pair scroll capture replies. */
const isRequestId = (value: unknown): value is string =>
	isBoundedString(value, previewProtocolLimits.requestIdLength);

/** Validates messages sent from the preview child to the builder parent. */
export const isPreviewChildMessage = (
	value: unknown,
): value is PreviewChildMessage => {
	if (!hasEnvelope(value)) return false;

	switch (value.type) {
		case previewProtocol.messages.ready:
			return hasOnlyKeys(value, ["scope", "version", "type"]);
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
