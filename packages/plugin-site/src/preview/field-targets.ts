import type { PreviewFieldTarget } from "@lucidcms/client/markup";
import type {
	ContentDocument,
	ResolvedLucidConfig,
} from "@lucidcms/core/types";
import isRecord from "../utils/is-record.js";

type Collection = ResolvedLucidConfig["collections"][number];
type FieldTree = Collection["contentFieldTree"];

/** Where the objects in a read document came from, for `editable()` during previews. */
export const fieldTargets = new WeakMap<object, PreviewFieldTarget>();

/** Records preview targets for sections, collapsibles, repeater groups and related documents through field configs, excluding values such as media and rich text from field editing. */
const recordFields = (
	fields: Record<string, unknown>,
	tree: FieldTree,
	target: PreviewFieldTarget,
	collections: Collection[],
) => {
	for (const config of tree) {
		if (
			config.type === "tab" ||
			((config.type === "section" || config.type === "collapsible") &&
				config.output === "inline")
		) {
			recordFields(fields, config.fields, target, collections);
			continue;
		}

		const value = fields[config.key];
		const path = [...target.path, config.key];
		if (config.type === "section" || config.type === "collapsible") {
			if (!isRecord(value)) continue;
			const sectionTarget = { ...target, path };
			fieldTargets.set(value, sectionTarget);
			recordFields(value, config.fields, sectionTarget, collections);
		} else if (config.type === "repeater") {
			if (!Array.isArray(value)) continue;
			value.forEach((group, index) => {
				if (!isRecord(group)) return;
				const groupTarget = { ...target, path: [...path, index] };
				fieldTargets.set(group, groupTarget);
				recordFields(group, config.fields, groupTarget, collections);
			});
		} else if (config.type === "relation") {
			if (!Array.isArray(value)) continue;
			// Related documents are edited in their own document.
			for (const document of value) {
				if (isRecord(document)) {
					recordDocument(document, target.locale, collections);
				}
			}
		}
	}
};

const recordDocument = (
	document: Record<string, unknown>,
	locale: string | undefined,
	collections: Collection[],
) => {
	const target: PreviewFieldTarget = {
		collectionKey: String(document.collectionKey),
		documentId: Number(document.id),
		...(locale ? { locale } : {}),
		path: [],
	};
	fieldTargets.set(document, target);

	const collection = collections.find(
		(item) => item.key === document.collectionKey,
	);
	if (!collection || !isRecord(document.fields)) return;
	fieldTargets.set(document.fields, target);
	recordFields(
		document.fields,
		collection.contentFieldTree,
		target,
		collections,
	);
};

/** Records document fields, bricks, repeater groups and sections for previews, retaining section and collapsible keys in paths for the admin to skip. */
const recordFieldTargets = (
	document: ContentDocument<string, boolean>,
	collections: Collection[],
) => {
	const locale = document.locale ?? undefined;
	recordDocument(document, locale, collections);

	const collection = collections.find(
		(item) => item.key === document.collectionKey,
	);
	const base: PreviewFieldTarget = {
		collectionKey: document.collectionKey,
		documentId: document.id,
		...(locale ? { locale } : {}),
		path: [],
	};
	const bricks = [
		...(document.bricks ?? []).map((brick) => ["builder", brick] as const),
		...Object.values(document.fixed ?? {}).map(
			(brick) => ["fixed", brick] as const,
		),
	];
	for (const [type, brick] of bricks) {
		if (!brick) continue;

		const target: PreviewFieldTarget = {
			...base,
			brick: { type, key: brick.key, order: brick.order },
		};
		fieldTargets.set(brick, target);
		fieldTargets.set(brick.fields, target);
		const builder = collection?.brickInstances.find(
			(item) => item.key === brick.key,
		);
		if (builder) {
			recordFields(brick.fields, builder.contentFieldTree, target, collections);
		}
	}
};

export default recordFieldTargets;
