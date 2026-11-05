import { decodeEditMarkup } from "@lucidcms/client/contract";
import { previewProtocolLimits } from "./constants.js";
import type {
	PreviewEditing,
	PreviewItem,
	PreviewPathSegment,
	PreviewTargetBrick,
	PreviewTargetPath,
	PreviewTarget,
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
const isPreviewTargetBrick = (value: unknown): value is PreviewTargetBrick =>
	isRecord(value) &&
	hasOnlyKeys(value, ["type", "key", "ref"]) &&
	(value.type === "fixed" || value.type === "builder") &&
	isBoundedString(value.key, previewProtocolLimits.brickKeyLength) &&
	isBoundedString(value.ref, previewProtocolLimits.refLength);

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

/** Whether a content path segment is a repeater item, rather than a field key. */
export const isPreviewItem = (
	segment: PreviewPathSegment | undefined,
): segment is PreviewItem => typeof segment === "object";

/** Whether two content path segments name the same field or repeater item. */
const isSamePreviewSegment = (
	a: PreviewPathSegment | undefined,
	b: PreviewPathSegment | undefined,
) => (isPreviewItem(a) ? isPreviewItem(b) && a.ref === b.ref : a === b);

const isSamePath = (a: PreviewTarget["path"], b: PreviewTarget["path"]) =>
	a.length === b.length &&
	a.every((segment, index) => isSamePreviewSegment(segment, b[index]));

/** Validates a content path, with keys for fields and refs for repeater items. */
const isPreviewPath = (value: unknown): value is PreviewTarget["path"] =>
	Array.isArray(value) &&
	value.length <= previewProtocolLimits.pathDepth &&
	value.every((segment) =>
		typeof segment === "string"
			? isBoundedString(segment, previewProtocolLimits.pathKeyLength)
			: isRecord(segment) &&
				hasOnlyKeys(segment, ["ref"]) &&
				isBoundedString(segment.ref, previewProtocolLimits.refLength),
	);

/** Validates and bounds a target received from markup or a message. */
export const isPreviewTarget = (value: unknown): value is PreviewTarget => {
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

	if (value.brick !== undefined && !isPreviewTargetBrick(value.brick)) {
		return false;
	}
	//* only a brick can be targeted without a path
	if (value.path.length === 0 && value.brick === undefined) return false;

	return (
		value.locale === undefined ||
		isBoundedString(value.locale, previewProtocolLimits.localeLength)
	);
};

const isPreviewTargetPath = (value: unknown): value is PreviewTargetPath =>
	isRecord(value) &&
	hasOnlyKeys(value, ["brick", "path"]) &&
	(value.brick === undefined || isPreviewTargetBrick(value.brick)) &&
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
		"editable",
		"repeaters",
		"errors",
		"theme",
	]) &&
	isBoundedString(
		value.collectionKey,
		previewProtocolLimits.collectionKeyLength,
	) &&
	isDocumentId(value.documentId) &&
	typeof value.editable === "boolean" &&
	Array.isArray(value.repeaters) &&
	value.repeaters.length <= previewProtocolLimits.repeaters &&
	value.repeaters.every(isPreviewRepeater) &&
	Array.isArray(value.errors) &&
	value.errors.length <= previewProtocolLimits.errors &&
	value.errors.every(isPreviewTargetPath) &&
	(value.theme === "light" || value.theme === "dark");

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
	isPreviewTarget(value.target) &&
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
	(value.previous === null || isPreviewTarget(value.previous)) &&
	(value.next === null || isPreviewTarget(value.next)) &&
	typeof value.horizontal === "boolean";

/** Validates what the page reports is under the pointer. */
export const isPreviewHover = (value: unknown): value is PreviewHover =>
	isRecord(value) &&
	hasOnlyKeys(value, [
		"brick",
		"item",
		"repeater",
		"selected",
		"pointer",
		"inset",
		"scrolling",
	]) &&
	(value.brick === null || isPreviewHoverBlock(value.brick)) &&
	(value.item === null || isPreviewHoverBlock(value.item)) &&
	(value.repeater === null || isPreviewHoverElement(value.repeater)) &&
	(value.selected === null || isPreviewHoverElement(value.selected)) &&
	(value.pointer === null ||
		(isRecord(value.pointer) &&
			hasOnlyKeys(value.pointer, ["x", "y"]) &&
			isFiniteNumber(value.pointer.x) &&
			isFiniteNumber(value.pointer.y))) &&
	isFiniteNumber(value.inset) &&
	typeof value.scrolling === "boolean";

export const getPreviewTargetKind = (
	target: PreviewTarget,
): PreviewTargetKind =>
	target.path.length === 0
		? "brick"
		: isPreviewItem(target.path.at(-1))
			? "item"
			: "field";

/** Whether two targets are the same field, item or brick, in any locale. */
export const isSamePreviewTarget = (a: PreviewTarget, b: PreviewTarget) =>
	a.collectionKey === b.collectionKey &&
	a.documentId === b.documentId &&
	a.brick?.type === b.brick?.type &&
	a.brick?.ref === b.brick?.ref &&
	isSamePath(a.path, b.path);

/** Whether a field, item or brick has a validation error, or holds a field that does. */
export const hasPreviewError = (
	errors: PreviewTargetPath[],
	target: PreviewTarget,
) =>
	errors.some(
		(error) =>
			error.brick?.type === target.brick?.type &&
			error.brick?.ref === target.brick?.ref &&
			target.path.length <= error.path.length &&
			target.path.every((segment, index) =>
				isSamePreviewSegment(segment, error.path[index]),
			),
	);

/** Whether two targets are bricks of one document, or items of one repeater, which can be moved next to each other. */
export const arePreviewSiblings = (a: PreviewTarget, b: PreviewTarget) => {
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
		isSamePath(a.path.slice(0, -1), b.path.slice(0, -1))
	);
};

export const isPreviewPlace = (value: unknown): value is PreviewPlace =>
	value === "before" || value === "after";

/** Validates a field's target, rather than a brick's or repeater item's, for editing its value. */
export const isPreviewFieldTarget = (value: unknown): value is PreviewTarget =>
	isPreviewTarget(value) && getPreviewTargetKind(value) === "field";

/** Accepts text typed or shown on the page, which may be empty, within the protocol's limit. */
export const isPreviewText = (value: unknown): value is string =>
	typeof value === "string" && value.length <= previewProtocolLimits.text;

/** Decodes the edit markup `@lucidcms/client` writes into a target, or null when it isn't a valid one. */
export const decodePreviewTarget = (value: string): PreviewTarget | null => {
	const decoded = decodeEditMarkup(value);
	return isPreviewTarget(decoded) ? decoded : null;
};
