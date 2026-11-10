import { getFieldSetState } from "../../../../libs/collection/definitions/fields/index.js";
import type {
	ContentContext,
	Owner,
} from "../../../../libs/collection/helpers/get-document-shape.js";
import resolveCollectionLocalization from "../../../../libs/collection/helpers/resolve-collection-localization.js";

/** Keys of fields stored per locale, for the collection and each of its bricks. Empty when the collection isn't localized. */
const getLocalizedKeys = (context: Omit<ContentContext, "access">) => {
	const enabled = resolveCollectionLocalization(context).enabled;
	const keys = (owner: Owner) =>
		enabled
			? Array.from(getFieldSetState(owner).fields.values()).flatMap((field) =>
					field.localizedEnabled ? [field.key] : [],
				)
			: [];
	const bricks = [
		...(context.collection.config.bricks?.fixed ?? []),
		...(context.collection.config.bricks?.builder ?? []),
		...(context.collection.config.bricks?.embedded ?? []),
	];

	return {
		fields: keys(context.collection),
		bricks: Object.fromEntries(
			bricks.flatMap((brick) => {
				const localized = keys(brick);
				return localized.length > 0 ? [[brick.key, localized]] : [];
			}),
		),
	};
};

export default getLocalizedKeys;
