import type z from "zod";
import type CollectionBuilder from "../../../../libs/collection/builders/collection-builder/index.js";
import filterReadableContent from "../../../../libs/collection/field-access/filter-readable-content.js";
import type { ContentAccess } from "../../../../libs/collection/field-access/types.js";
import resolveCollectionLocalization from "../../../../libs/collection/helpers/resolve-collection-localization.js";
import type { ContentInput } from "../../../../libs/translations/list-content-fields.js";
import listTranslationStates from "../../../../libs/translations/list-translation-states.js";
import type { TranslationState } from "../../../../libs/translations/read-translation-state.js";
import type { BrickInputSchema } from "../../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../../schemas/collection-fields.js";
import type { ResolvedLucidConfig } from "../../../../types/config.js";
import type { translationStateSchema } from "../get/schema.js";

const stateNames = {
	missing: "missing",
	current: "machine",
	outdated: "machine_outdated",
	byPerson: "person",
	byPersonOutdated: "person_outdated",
} as const satisfies Record<
	TranslationState,
	z.infer<typeof translationStateSchema>
>;

/**
 * Where each readable localized field's translation stands in every other
 * locale, naming bricks the way documents_get does. Undefined when the
 * collection isn't localized.
 */
const projectTranslations = (props: {
	collection: CollectionBuilder;
	localization: ResolvedLucidConfig["localization"];
	access: ContentAccess;
	content: ContentInput;
}) => {
	const localization = resolveCollectionLocalization({
		localization: props.localization,
		collection: props.collection,
	});
	if (!localization.enabled) return undefined;

	const content = filterReadableContent<FieldInputSchema, BrickInputSchema>(
		props.access,
		props.content,
	);
	//* fixed bricks are named by key, the rest by ref
	const brickNames = new Map(
		(content.bricks ?? []).map((brick) => [
			brick.ref,
			brick.type === "fixed" ? brick.key : brick.ref,
		]),
	);

	return {
		sourceLocale: localization.defaultLocale,
		locales: listTranslationStates({
			collection: props.collection,
			localization,
			content,
		}).map(({ locale, fields }) => ({
			locale,
			fields: fields.map((field) => ({
				brick:
					field.brick === null
						? null
						: (brickNames.get(field.brick) ?? field.brick),
				path: field.path,
				state: stateNames[field.state],
			})),
		})),
	};
};

export default projectTranslations;
