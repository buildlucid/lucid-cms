import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import resolveCollectionLocalization from "../../../libs/collection/helpers/resolve-collection-localization.js";
import { copy } from "../../../libs/i18n/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";

/**
 * Validates a requested content locale against the collection, falling back to
 * its default. Resolves to null for unlocalized collections.
 */
const resolveContentLocale = (
	context: ServiceContext,
	collection: CollectionBuilder,
	requested: string | undefined,
): Awaited<ServiceResponse<string | null>> => {
	const localization = resolveCollectionLocalization({
		localization: context.config.localization,
		collection,
	});
	if (requested && !localization.locales.includes(requested)) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.tools.content.locale.unknown"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data:
			requested ?? (localization.enabled ? localization.defaultLocale : null),
	};
};

export default resolveContentLocale;
