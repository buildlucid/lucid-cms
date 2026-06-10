import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";

const getTranslatedCollectionDetails = (
	context: ServiceContext,
	collection: CollectionBuilder,
) => {
	const translate = context.translate.forLocale(
		context.config.i18n.defaultLocale,
	);
	const name = translate(collection.config.details.name);
	const singularName = translate(collection.config.details.singularName);
	const summary = translate(collection.config.details.summary);

	if (!name && !singularName && !summary) return undefined;

	return {
		...(name ? { name } : {}),
		...(singularName ? { singularName } : {}),
		...(summary ? { summary } : {}),
	};
};

export default getTranslatedCollectionDetails;
