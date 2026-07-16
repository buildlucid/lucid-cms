import { previewProtocolLimits } from "./constants.js";
import type {
	PreviewFieldBrick,
	PreviewFieldTarget,
	PreviewScrollState,
} from "./types.js";
import { hasOnlyKeys, isBoundedString, isRecord } from "./utils/validation.js";

/** Validates the saved brick position used to locate a builder field. */
const isPreviewFieldBrick = (value: unknown): value is PreviewFieldBrick =>
	isRecord(value) &&
	hasOnlyKeys(value, ["type", "key", "order"]) &&
	(value.type === "fixed" || value.type === "builder") &&
	isBoundedString(value.key, previewProtocolLimits.brickKeyLength) &&
	typeof value.order === "number" &&
	Number.isSafeInteger(value.order) &&
	value.order >= -1;

/** Validates a scroll position before it crosses the preview boundary. */
export const isPreviewScrollState = (
	value: unknown,
): value is PreviewScrollState =>
	isRecord(value) &&
	hasOnlyKeys(value, ["pageKey", "x", "y"]) &&
	isBoundedString(value.pageKey, previewProtocolLimits.pageKeyLength) &&
	typeof value.x === "number" &&
	Number.isFinite(value.x) &&
	typeof value.y === "number" &&
	Number.isFinite(value.y);

/** Validates and bounds a field target received from markup or a message. */
export const isPreviewFieldTarget = (
	value: unknown,
): value is PreviewFieldTarget => {
	if (
		!isRecord(value) ||
		!hasOnlyKeys(value, [
			"collectionKey",
			"documentId",
			"brick",
			"path",
			"locale",
		]) ||
		!isBoundedString(
			value.collectionKey,
			previewProtocolLimits.collectionKeyLength,
		) ||
		typeof value.documentId !== "number" ||
		!Number.isSafeInteger(value.documentId) ||
		value.documentId < 1 ||
		!Array.isArray(value.path) ||
		value.path.length < 1 ||
		value.path.length > previewProtocolLimits.pathDepth
	) {
		return false;
	}

	if (value.brick !== undefined && !isPreviewFieldBrick(value.brick)) {
		return false;
	}

	if (
		value.locale !== undefined &&
		!isBoundedString(value.locale, previewProtocolLimits.localeLength)
	) {
		return false;
	}

	return value.path.every((segment) =>
		typeof segment === "string"
			? isBoundedString(segment, previewProtocolLimits.pathKeyLength)
			: typeof segment === "number" &&
				Number.isSafeInteger(segment) &&
				segment >= 0,
	);
};
