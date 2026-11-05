import { previewTargetKey } from "@lucidcms/client/contract";
import type {
	PreviewItem,
	PreviewTarget,
	PreviewTargetBrick,
} from "@lucidcms/types";
import type { FieldConfig, FieldTypes } from "../../exports/types.js";
import isPlainObject from "../../utils/helpers/is-plain-object.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import { fieldHooks } from "../collection/custom-fields/registered-fields.js";
import { storageModes } from "../collection/custom-fields/storage/index.js";

/** Carries a repeater item's ref from its stored group into the content preview reads mark, without showing up in JSON. */
export const itemRef = Symbol("lucid.item-ref");

type Base = Omit<PreviewTarget, "path">;
type Path = Array<string | PreviewItem>;
type Content = Record<string, unknown>;

const mark = (value: Content, target: PreviewTarget) => {
	value[previewTargetKey] = target;
};

const isDocument = (value: unknown): value is Content & { fields: Content } =>
	isPlainObject(value) &&
	typeof value.collectionKey === "string" &&
	typeof value.id === "number" &&
	isPlainObject(value.fields);

/** Marks the sections nested in a fields map and its repeater items, and the related documents in its values. */
const markFields = (
	fields: Content,
	tree: FieldConfig<FieldTypes>[],
	base: Base,
	path: Path,
	collections: CollectionBuilder[],
) => {
	for (const config of tree) {
		const value = fields[config.key];
		const children = fieldHooks[config.type].contentChildren?.(config);
		if (children) {
			if (children.output === "inline") {
				markFields(fields, children.fields, base, path, collections);
			} else if (isPlainObject(value)) {
				const nested = [...path, config.key];
				mark(value, { ...base, path: nested });
				markFields(value, children.fields, base, nested, collections);
			}
			continue;
		}

		const storage = storageModes[fieldHooks[config.type].config.database.mode];
		if (storage.mode === "tree-table") {
			if (!Array.isArray(value)) continue;
			const childConfigs = storage.getChildFieldConfigs(config) ?? [];
			for (const item of value) {
				if (!isPlainObject(item)) continue;
				const ref = item[itemRef];
				if (typeof ref !== "string") continue;
				const itemPath = [...path, config.key, { ref }];
				mark(item, { ...base, path: itemPath });
				markFields(item, childConfigs, base, itemPath, collections);
			}
			continue;
		}

		for (const related of Array.isArray(value) ? value : [value]) {
			if (isDocument(related)) markDocument(related, collections);
		}
	}
};

const markBrick = (
	brick: unknown,
	type: PreviewTargetBrick["type"],
	base: Base,
	collection: CollectionBuilder,
	collections: CollectionBuilder[],
) => {
	if (
		!isPlainObject(brick) ||
		typeof brick.key !== "string" ||
		typeof brick.ref !== "string" ||
		!isPlainObject(brick.fields)
	) {
		return;
	}
	const builder = collection.brickInstances.find(
		(item) => item.key === brick.key,
	);
	if (!builder) return;
	const owner = { ...base, brick: { type, key: brick.key, ref: brick.ref } };
	mark(brick, { ...owner, path: [] });
	markFields(brick.fields, builder.contentFieldTree, owner, [], collections);
};

/**
 * Adds serializable `$preview` targets for `editable()` to documents, bricks, repeater items,
 * sections and related documents.
 */
export const markDocument = (
	document: Content,
	collections: CollectionBuilder[],
) => {
	const collection = collections.find(
		(item) => item.key === document.collectionKey,
	);
	if (
		!collection ||
		typeof document.collectionKey !== "string" ||
		typeof document.id !== "number"
	) {
		return;
	}
	const base: Base = {
		collectionKey: document.collectionKey,
		documentId: document.id,
		...(typeof document.locale === "string" ? { locale: document.locale } : {}),
	};
	mark(document, { ...base, path: [] });
	if (isPlainObject(document.fields)) {
		markFields(
			document.fields,
			collection.contentFieldTree,
			base,
			[],
			collections,
		);
	}
	if (Array.isArray(document.bricks)) {
		for (const brick of document.bricks) {
			markBrick(brick, "builder", base, collection, collections);
		}
	}
	if (isPlainObject(document.fixed)) {
		for (const brick of Object.values(document.fixed)) {
			markBrick(brick, "fixed", base, collection, collections);
		}
	}
};
