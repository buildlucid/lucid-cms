import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";

const getTranslatedCollectionDetails = (
	context: ServiceContext,
	collection: CollectionBuilder,
) => {
	const translate = context.translate.forLocale(
		context.config.i18n.defaultLocale,
	);
	const details = collection.getData.details;
	const name = translate(details.labels.plural);
	const singularName = translate(details.labels.singular);
	const summary = translate(details.description ?? undefined);
	if (!name && !singularName && !summary) return undefined;

	return {
		...(name ? { name } : {}),
		...(singularName ? { singularName } : {}),
		...(summary ? { summary } : {}),
	};
};

export default getTranslatedCollectionDetails;
