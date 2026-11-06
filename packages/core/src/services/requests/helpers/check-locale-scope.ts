import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import resolveCollectionLocalization from "../../../libs/collection/helpers/resolve-collection-localization.js";
import { copy } from "../../../libs/i18n/index.js";
import type { LocalizationConfig } from "../../../types/config.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

/**
 * Requests limited to some locales only write those locales' values onto
 * latest, so they capture latest, target only latest, and need a collection
 * that has every one of their locales.
 */
const checkLocaleScope = (data: {
	collection: CollectionBuilder;
	localization: LocalizationConfig;
	locales: string[];
	source: string | null;
	targets: string[];
}): Awaited<ServiceResponse<undefined>> => {
	const localization = resolveCollectionLocalization({
		localization: data.localization,
		collection: data.collection,
	});
	if (
		data.source !== "latest" ||
		data.targets.some((target) => target !== "latest") ||
		!localization.enabled ||
		data.locales.some((locale) => !localization.locales.includes(locale))
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.locales.invalid"),
				status: 400,
			},
			data: undefined,
		};
	}

	return { error: undefined, data: undefined };
};

export default checkLocaleScope;
