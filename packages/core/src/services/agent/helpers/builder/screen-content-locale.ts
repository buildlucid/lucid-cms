import type CollectionDefinition from "../../../../libs/collection/definitions/collection/index.js";
import resolveCollectionLocalization from "../../../../libs/collection/helpers/resolve-collection-localization.js";
import type { ServiceContext } from "../../../../utils/services/types.js";

/**
 * Returns the builder's content locale only for localized collections. Unlocalized screens still
 * report an editor locale, which tools must ignore.
 */
const screenContentLocale = (
	context: ServiceContext,
	collection: CollectionDefinition,
	locale: string | null | undefined,
): string | undefined =>
	resolveCollectionLocalization({
		localization: context.config.localization,
		collection,
	}).enabled
		? (locale ?? undefined)
		: undefined;

export default screenContentLocale;
