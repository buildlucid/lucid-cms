import { previewProtocolLimits } from "./constants.js";
import type {
	PreviewEditing,
	PreviewFieldBrick,
	PreviewFieldPath,
	PreviewFieldTarget,
	PreviewHover,
	PreviewHoverBlock,
	PreviewHoverElement,
	PreviewPlace,
	PreviewRect,
	PreviewRepeater,
	PreviewScrollState,
	PreviewTargetKind,
} from "./types.js";
import {
	hasOnlyKeys,
	isBoundedString,
	isFiniteNumber,
	isRecord,
} from "./utils/validation.js";

/** Validates the brick a field is in. */
const isPreviewFieldBrick = (value: unknown): value is PreviewFieldBrick =>
	isRecord(value) &&
	hasOnlyKeys(value, ["type", "key", "ref"]) &&
	(value.type === "fixed" || value.type === "builder") &&
	isBoundedString(value.key, previewProtocolLimits.brickKeyLength) &&
	isBoundedString(value.ref, previewProtocolLimits.brickRefLength);

/** Accepts saved document IDs only. */
const isDocumentId = (value: unknown): value is number =>
	typeof value === "number" && Number.isSafeInteger(value) && value >= 1;

/** Validates a scroll position before it crosses the preview boundary. */
export const isPreviewScrollState = (
	value: unknown,
): value is PreviewScrollState =>
	isRecord(value) &&
	hasOnlyKeys(value, ["pageKey", "x", "y"]) &&
	isBoundedString(value.pageKey, previewProtocolLimits.pageKeyLength) &&
	isFiniteNumber(value.x) &&
	isFiniteNumber(value.y);

/** Validates a content path, with keys for fields and indexes for repeater items. */
const isPreviewPath = (value: unknown): value is Array<string | number> =>
	Array.isArray(value) &&
	value.length <= previewProtocolLimits.pathDepth &&
	value.every((segment) =>
		typeof segment === "string"
			? isBoundedString(segment, previewProtocolLimits.pathKeyLength)
			: typeof segment === "number" &&
				Number.isSafeInteger(segment) &&
				segment >= 0,
	);

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
		!isDocumentId(value.documentId) ||
		!isPreviewPath(value.path)
	) {
		return false;
	}

	if (value.brick !== undefined && !isPreviewFieldBrick(value.brick)) {
		return false;
	}
	//* only a brick can be targeted without a path
	if (value.path.length === 0 && value.brick === undefined) return false;

	return (
		value.locale === undefined ||
		isBoundedString(value.locale, previewProtocolLimits.localeLength)
	);
};

const isPreviewFieldPath = (value: unknown): value is PreviewFieldPath =>
	isRecord(value) &&
	hasOnlyKeys(value, ["brick", "path"]) &&
	(value.brick === undefined || isPreviewFieldBrick(value.brick)) &&
	isPreviewPath(value.path);

const isBrickKey = (value: unknown): value is string =>
	isBoundedString(value, previewProtocolLimits.brickKeyLength);

const isPreviewRepeater = (value: unknown): value is PreviewRepeater =>
	isRecord(value) &&
	hasOnlyKeys(value, ["brick", "path"]) &&
	(value.brick === undefined || isBrickKey(value.brick)) &&
	Array.isArray(value.path) &&
	value.path.length > 0 &&
	value.path.length <= previewProtocolLimits.pathDepth &&
	value.path.every((segment) =>
		isBoundedString(segment, previewProtocolLimits.pathKeyLength),
	);

/** Validates the document edit mode is turned on for. */
export const isPreviewEditing = (value: unknown): value is PreviewEditing =>
	isRecord(value) &&
	hasOnlyKeys(value, [
		"collectionKey",
		"documentId",
		"structure",
		"repeaters",
		"errors",
	]) &&
	isBoundedString(
		value.collectionKey,
		previewProtocolLimits.collectionKeyLength,
	) &&
	isDocumentId(value.documentId) &&
	typeof value.structure === "boolean" &&
	Array.isArray(value.repeaters) &&
	value.repeaters.length <= previewProtocolLimits.repeaters &&
	value.repeaters.every(isPreviewRepeater) &&
	Array.isArray(value.errors) &&
	value.errors.length <= previewProtocolLimits.errors &&
	value.errors.every(isPreviewFieldPath);

const isPreviewRect = (value: unknown): value is PreviewRect =>
	isRecord(value) &&
	hasOnlyKeys(value, ["x", "y", "width", "height"]) &&
	isFiniteNumber(value.x) &&
	isFiniteNumber(value.y) &&
	isFiniteNumber(value.width) &&
	isFiniteNumber(value.height) &&
	value.width >= 0 &&
	value.height >= 0;

const isElementParts = (value: Record<string, unknown>) =>
	typeof value.key === "number" &&
	Number.isSafeInteger(value.key) &&
	value.key >= 0 &&
	isPreviewFieldTarget(value.target) &&
	isPreviewRect(value.rect);

const isPreviewHoverElement = (value: unknown): value is PreviewHoverElement =>
	isRecord(value) &&
	hasOnlyKeys(value, ["key", "target", "rect"]) &&
	isElementParts(value);

const isPreviewHoverBlock = (value: unknown): value is PreviewHoverBlock =>
	isRecord(value) &&
	hasOnlyKeys(value, [
		"key",
		"target",
		"rect",
		"previous",
		"next",
		"horizontal",
	]) &&
	isElementParts(value) &&
	(value.previous === null || isPreviewFieldTarget(value.previous)) &&
	(value.next === null || isPreviewFieldTarget(value.next)) &&
	typeof value.horizontal === "boolean";

/** Validates what the page reports is under the pointer. */
export const isPreviewHover = (value: unknown): value is PreviewHover =>
	isRecord(value) &&
	hasOnlyKeys(value, [
		"brick",
		"item",
		"repeater",
		"pointer",
		"inset",
		"scrolling",
	]) &&
	(value.brick === null || isPreviewHoverBlock(value.brick)) &&
	(value.item === null || isPreviewHoverBlock(value.item)) &&
	(value.repeater === null || isPreviewHoverElement(value.repeater)) &&
	(value.pointer === null ||
		(isRecord(value.pointer) &&
			hasOnlyKeys(value.pointer, ["x", "y"]) &&
			isFiniteNumber(value.pointer.x) &&
			isFiniteNumber(value.pointer.y))) &&
	isFiniteNumber(value.inset) &&
	typeof value.scrolling === "boolean";

export const getPreviewTargetKind = (
	target: PreviewFieldTarget,
): PreviewTargetKind =>
	target.path.length === 0
		? "brick"
		: typeof target.path.at(-1) === "number"
			? "item"
			: "field";

/** Whether two targets are the same field, item or brick, in any locale. */
export const isSamePreviewTarget = (
	a: PreviewFieldTarget,
	b: PreviewFieldTarget,
) =>
	a.collectionKey === b.collectionKey &&
	a.documentId === b.documentId &&
	a.brick?.type === b.brick?.type &&
	a.brick?.ref === b.brick?.ref &&
	a.path.length === b.path.length &&
	a.path.every((segment, index) => segment === b.path[index]);

/** Whether a field, item or brick has a validation error, or holds a field that does. */
export const hasPreviewError = (
	errors: PreviewFieldPath[],
	target: PreviewFieldTarget,
) =>
	errors.some(
		(error) =>
			error.brick?.type === target.brick?.type &&
			error.brick?.ref === target.brick?.ref &&
			target.path.length <= error.path.length &&
			target.path.every((segment, index) => segment === error.path[index]),
	);

/** Whether two targets are bricks of one document, or items of one repeater, which can be moved next to each other. */
export const arePreviewSiblings = (
	a: PreviewFieldTarget,
	b: PreviewFieldTarget,
) => {
	const kind = getPreviewTargetKind(a);
	if (
		kind === "field" ||
		kind !== getPreviewTargetKind(b) ||
		a.collectionKey !== b.collectionKey ||
		a.documentId !== b.documentId
	) {
		return false;
	}
	if (kind === "brick") {
		return a.brick?.type === "builder" && b.brick?.type === "builder";
	}
	return (
		a.brick?.type === b.brick?.type &&
		a.brick?.ref === b.brick?.ref &&
		a.path.length === b.path.length &&
		a.path.slice(0, -1).every((segment, index) => segment === b.path[index])
	);
};

export const isPreviewPlace = (value: unknown): value is PreviewPlace =>
	value === "before" || value === "after";
