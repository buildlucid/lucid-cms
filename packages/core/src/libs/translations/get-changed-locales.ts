import { isDeepStrictEqual } from "node:util";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type { ResolvedCollectionLocalization } from "../collection/helpers/resolve-collection-localization.js";
import listContentFields, {
	type ContentField,
	type ContentInput,
	contentFieldId,
} from "./list-content-fields.js";

const brickLayout = (content: ContentInput) =>
	(content.bricks ?? [])
		.toSorted((a, b) => a.order - b.order)
		.map((brick) => `${brick.type}:${brick.key}:${brick.ref}`);

const itemRefs = (entry: ContentField | undefined) =>
	(entry?.field.groups ?? [])
		.toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0))
		.map((group) => group.ref);

/**
 * The locales whose values differ between two versions of a document's
 * content. Null stands for everything shared between locales: unlocalized
 * fields and which bricks and repeater items there are, and their order.
 */
const getChangedLocales = (props: {
	collection: CollectionBuilder;
	localization: ResolvedCollectionLocalization;
	previous: ContentInput;
	next: ContentInput;
}): Set<string | null> => {
	const changed = new Set<string | null>();
	if (
		!isDeepStrictEqual(brickLayout(props.previous), brickLayout(props.next))
	) {
		changed.add(null);
	}

	const previous = new Map(
		listContentFields(props.collection, props.previous).map((entry) => [
			contentFieldId(entry),
			entry,
		]),
	);
	const next = new Map(
		listContentFields(props.collection, props.next).map((entry) => [
			contentFieldId(entry),
			entry,
		]),
	);

	for (const id of new Set([...previous.keys(), ...next.keys()])) {
		const before = previous.get(id);
		const after = next.get(id);
		const instance = (after ?? before)?.instance;
		if (!instance) continue;

		if (before?.field.groups || after?.field.groups) {
			if (!isDeepStrictEqual(itemRefs(before), itemRefs(after))) {
				changed.add(null);
			}
			continue;
		}

		if (!props.localization.enabled || !instance.localizedEnabled) {
			if (
				!isDeepStrictEqual(
					before?.field.value ?? null,
					after?.field.value ?? null,
				)
			) {
				changed.add(null);
			}
			continue;
		}

		//* a checked or newly recorded translation counts too, so requests don't land older sources over it
		for (const locale of props.localization.locales) {
			if (
				!isDeepStrictEqual(
					before?.field.translations?.[locale] ?? null,
					after?.field.translations?.[locale] ?? null,
				) ||
				!isDeepStrictEqual(
					before?.field.translationSources?.[locale] ?? null,
					after?.field.translationSources?.[locale] ?? null,
				)
			) {
				changed.add(locale);
			}
		}
	}

	return changed;
};

export default getChangedLocales;
