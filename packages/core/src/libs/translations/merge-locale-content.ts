import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import { fieldHooks } from "../collection/custom-fields/registered-fields.js";
import type { ResolvedCollectionLocalization } from "../collection/helpers/resolve-collection-localization.js";
import listContentFields, {
	type ContentInput,
	contentFieldId,
} from "./list-content-fields.js";

/** The embedded bricks the content's values point at, in any locale. */
const referencedEmbeddedBricks = (
	collection: CollectionBuilder,
	content: ContentInput,
): Set<string> =>
	new Set(
		listContentFields(collection, content).flatMap((entry) => {
			const extract = fieldHooks[entry.field.type].extractEmbeddedBrickRefs;
			if (!extract) return [];
			return [
				entry.field.value,
				...Object.values(entry.field.translations ?? {}),
			].flatMap((value) => extract(value));
		}),
	);

/**
 * Copies selected locales by brick and item refs, preserving other target content. Includes
 * referenced embedded bricks so copied rich text has no missing targets.
 */
const mergeLocaleContent = <T extends ContentInput>(props: {
	collection: CollectionBuilder;
	localization: ResolvedCollectionLocalization;
	target: T;
	source: ContentInput;
	locales: readonly string[];
}): T => {
	const merged = structuredClone(props.target);
	if (!props.localization.enabled) return merged;

	const source = new Map(
		listContentFields(props.collection, props.source).map((entry) => [
			contentFieldId(entry),
			entry.field,
		]),
	);

	for (const entry of listContentFields(props.collection, merged)) {
		if (!entry.instance.localizedEnabled || entry.field.groups) continue;

		const sourceField = source.get(contentFieldId(entry));
		if (!sourceField) continue;

		for (const locale of props.locales) {
			entry.field.translations = {
				...entry.field.translations,
				[locale]: sourceField.translations?.[locale] ?? null,
			};

			const translationSource = sourceField.translationSources?.[locale];
			if (translationSource) {
				entry.field.translationSources = {
					...entry.field.translationSources,
					[locale]: translationSource,
				};
			} else if (entry.field.translationSources) {
				const { [locale]: _removed, ...rest } = entry.field.translationSources;
				entry.field.translationSources = rest;
			}
		}
	}

	//* embedded bricks can hold further embedded bricks, so keep going until none are missing
	const sourceBricks = new Map(
		(props.source.bricks ?? [])
			.filter((brick) => brick.type === "embedded")
			.map((brick) => [brick.ref, brick]),
	);
	for (;;) {
		const present = new Set((merged.bricks ?? []).map((brick) => brick.ref));
		const missing = [
			...referencedEmbeddedBricks(props.collection, merged),
		].flatMap((ref) => {
			const brick = present.has(ref) ? undefined : sourceBricks.get(ref);
			return brick ? [structuredClone(brick)] : [];
		});
		if (missing.length === 0) break;
		merged.bricks = [...(merged.bricks ?? []), ...missing];
	}

	return merged;
};

export default mergeLocaleContent;
