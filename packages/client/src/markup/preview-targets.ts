import type { PreviewFieldTarget } from "@lucidcms/types";
import {
	encodePreviewFieldTarget,
	previewFieldAttribute,
} from "./field-markup.js";

//* a global symbol, so separately bundled copies of this module find each other's targets
const targetKey = Symbol.for("lucid.preview-target");
//* deeper values, such as rich text, can't be targeted anyway
const maxPathDepth = 32;

type ContentBrickSource = {
	ref: string;
	key: string;
	fields: object;
};

/** The parts of a content API document that preview targets are recorded from. */
export type PreviewTargetSource = {
	id: number;
	collectionKey: string;
	locale?: string | null;
	fields: object;
	bricks?: ReadonlyArray<ContentBrickSource>;
	fixed?: { readonly [key: string]: ContentBrickSource | undefined };
};

type Tagged = { readonly [targetKey]?: PreviewFieldTarget };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Related documents in fields are found by their shape. */
const isDocument = (
	value: Record<string, unknown>,
): value is Record<string, unknown> & PreviewTargetSource =>
	typeof value.collectionKey === "string" &&
	typeof value.id === "number" &&
	isRecord(value.fields);

const isBrick = (value: unknown): value is ContentBrickSource =>
	isRecord(value) &&
	typeof value.ref === "string" &&
	typeof value.key === "string" &&
	isRecord(value.fields);

/** Stores a target on an object without changing its keys, so JSON, spreads and equality checks ignore it. */
const tag = (value: object, target: PreviewFieldTarget) => {
	if (!Object.isExtensible(value)) return;
	Object.defineProperty(value, targetKey, {
		value: target,
		configurable: true,
	});
};

/** Tags the objects inside fields, such as sections and repeater items, with their path. Related documents get their own targets. */
const recordFields = (fields: object, target: PreviewFieldTarget) => {
	for (const [key, value] of Object.entries(fields)) {
		const entries: Array<[unknown, Array<string | number>]> = Array.isArray(
			value,
		)
			? value.map((item, index) => [item, [key, index]])
			: [[value, [key]]];

		for (const [item, segments] of entries) {
			if (!isRecord(item)) continue;
			if (isDocument(item)) {
				recordDocument(item, target.locale);
				continue;
			}
			const path = [...target.path, ...segments];
			if (path.length >= maxPathDepth) continue;
			const nested = { ...target, path };
			tag(item, nested);
			recordFields(item, nested);
		}
	}
};

const recordDocument = (
	document: PreviewTargetSource,
	locale: string | undefined,
) => {
	const base: PreviewFieldTarget = {
		collectionKey: document.collectionKey,
		documentId: document.id,
		...(locale ? { locale } : {}),
		path: [],
	};
	tag(document, base);
	tag(document.fields, base);
	recordFields(document.fields, base);

	const bricks = [
		...(Array.isArray(document.bricks) ? document.bricks : []).map(
			(brick) => ["builder", brick] as const,
		),
		...Object.values(isRecord(document.fixed) ? document.fixed : {}).map(
			(brick) => ["fixed", brick] as const,
		),
	];
	for (const [type, brick] of bricks) {
		if (!isBrick(brick)) continue;
		const target: PreviewFieldTarget = {
			...base,
			brick: { type, key: brick.key, ref: brick.ref },
		};
		tag(brick, target);
		tag(brick.fields, target);
		recordFields(brick.fields, target);
	}
};

/**
 * Records where a previewed document's objects are, for `previewAttributes()`. Client reads
 * that pass a preview token do this already; call it for documents read another way.
 */
export const recordPreviewTargets = (document: PreviewTargetSource) => {
	recordDocument(document, document.locale ?? undefined);
};

/**
 * The target for a field of a recorded document, brick, section or repeater item, or for the
 * brick itself without a field. Null for anything else, such as content read without a preview.
 */
export const getPreviewTarget = (
	source: unknown,
	field?: string,
): PreviewFieldTarget | null => {
	if (typeof source !== "object" || source === null) return null;
	const recorded = (source as Tagged)[targetKey];
	if (!recorded) return null;

	const next =
		field === undefined
			? recorded
			: { ...recorded, path: [...recorded.path, field] };
	return next.path.length > 0 || next.brick ? next : null;
};

/**
 * Attributes that mark a field, or a brick without a field, for the builder preview. Spread
 * them onto the element that renders it, eg. `<h1 {...previewAttributes(page, "title")}>`.
 * Empty outside previews.
 */
export const previewAttributes = (
	source: unknown,
	field?: string,
): { [previewFieldAttribute]?: string } => {
	const target = getPreviewTarget(source, field);
	const encoded = target ? encodePreviewFieldTarget(target) : null;
	return encoded ? { [previewFieldAttribute]: encoded } : {};
};
