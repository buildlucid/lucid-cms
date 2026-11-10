import type CollectionDefinition from "../collection/definitions/collection/index.js";
import getEmbeddedBrickAccess from "../collection/field-access/get-embedded-brick-access.js";
import type { ContentAccess } from "../collection/field-access/types.js";
import type { ResolvedCollectionLocalization } from "../collection/helpers/resolve-collection-localization.js";
import type { ContentInput } from "./list-content-fields.js";
import listTranslationItems, {
	type TranslationItem,
} from "./list-translation-items.js";
import readTranslationState from "./read-translation-state.js";

/** A field to translate into one locale. */
export type SelectedTranslation = {
	documentId: number;
	locale: string;
	item: TranslationItem;
};

/**
 * Selects missing or stale machine translations, or all values with `overwrite`. Excludes fields
 * and embedded bricks the actor cannot change.
 */
const selectTranslations = (props: {
	collection: CollectionDefinition;
	localization: ResolvedCollectionLocalization;
	documents: Array<{ id: number; content: ContentInput }>;
	locales: string[];
	overwrite: boolean;
	access: ContentAccess;
}): SelectedTranslation[] =>
	props.documents.flatMap((document) => {
		const items = listTranslationItems({
			collection: props.collection,
			localization: props.localization,
			content: document.content,
		});
		const embeddedAccess = getEmbeddedBrickAccess(props.access, {
			fields: document.content.fields ?? [],
			bricks: document.content.bricks ?? [],
		});
		const embeddedRefs = new Set(
			(document.content.bricks ?? [])
				.filter((brick) => brick.type === "embedded")
				.map((brick) => brick.ref),
		);

		const editable = (item: TranslationItem) => {
			const brick = item.entry.brick;
			if (brick !== null && embeddedRefs.has(brick)) {
				if (embeddedAccess.get(brick) !== "editable") return false;
			}

			const owner =
				brick === null
					? undefined
					: props.access.bricks.get(item.entry.owner.key);
			if (owner && owner.access !== "editable") return false;

			//* every other path segment is a field key, the rest are repeater item refs
			const fields = owner?.fields ?? props.access.fields;
			return item.entry.path
				.filter((_, index) => index % 2 === 0)
				.every((key) => (fields.get(key) ?? "editable") === "editable");
		};

		return props.locales.flatMap((locale) =>
			items.flatMap((item) => {
				const state = readTranslationState(item, locale);
				const translate =
					props.overwrite || state === "missing" || state === "outdated";
				return translate && editable(item)
					? [{ documentId: document.id, locale, item }]
					: [];
			}),
		);
	});

export default selectTranslations;
