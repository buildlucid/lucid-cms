import type { FieldInputSchema } from "../../../exports/types.js";
import type BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { getFieldBuilderState } from "../../../libs/collection/builders/field-builder/index.js";
import { fieldHooks } from "../../../libs/collection/custom-fields/registered-fields.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";

/**
 * Resolves the locale each embedded brick belongs to. A brick held in one
 * locale's value of a localized field only exists in that locale, and bricks
 * nested inside it inherit it. `null` means the brick is shared by every
 * locale, such as when a non-localized field holds it.
 */
const getEmbeddedBrickLocales = (props: {
	fields: FieldInputSchema[];
	bricks: BrickInputSchema[];
	collection: CollectionBuilder;
	localized: boolean;
}): Map<string, string | null> => {
	const result = new Map<string, string | null>();
	const embedded = new Map(
		props.bricks
			.filter((brick) => brick.type === "embedded")
			.map((brick) => [brick.ref, brick]),
	);
	const findInstance = (brick: BrickInputSchema): BrickBuilder | undefined =>
		props.collection.config.bricks?.[brick.type]?.find(
			(instance) => instance.key === brick.key,
		);

	const visit = (
		fields: FieldInputSchema[],
		instance: CollectionBuilder | BrickBuilder,
		parent: string | null,
	) => {
		for (const field of fields) {
			const extract = fieldHooks[field.type].extractEmbeddedBrickRefs;
			if (extract) {
				const localized =
					props.localized &&
					getFieldBuilderState(instance).fields.get(field.key)
						?.localizedEnabled === true;
				for (const ref of extract(field.value)) hold(ref, parent);
				for (const [locale, value] of Object.entries(
					field.translations ?? {},
				)) {
					for (const ref of extract(value)) {
						hold(ref, parent ?? (localized ? locale : null));
					}
				}
			}
			for (const group of field.groups ?? []) {
				visit(group.fields, instance, parent);
			}
		}
	};
	//* a brick held by more than one locale is shared, so each ref is revisited at most twice and cycles end
	const hold = (ref: string, locale: string | null) => {
		const previous = result.get(ref);
		const next = previous === undefined || previous === locale ? locale : null;
		if (next === previous) return;

		result.set(ref, next);
		const brick = embedded.get(ref);
		const instance = brick ? findInstance(brick) : undefined;
		if (brick && instance) visit(brick.fields ?? [], instance, next);
	};

	visit(props.fields, props.collection, null);
	for (const brick of props.bricks) {
		if (brick.type === "embedded") continue;
		const instance = findInstance(brick);
		if (instance) visit(brick.fields ?? [], instance, null);
	}
	return result;
};

export default getEmbeddedBrickLocales;
