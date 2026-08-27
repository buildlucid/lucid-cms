import type { Config } from "../../../types.js";
import type CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import { translate } from "../../i18n/index.js";

/** Validates collection locale options against the project locale catalogue. */
const checkCollectionLocalization = (
	localization: Config["localization"],
	collection: CollectionBuilder,
) => {
	const configured = collection.config.localized ?? false;
	if (configured === false) return;

	const globalLocaleCodes = localization.locales.map((locale) => locale.code);
	const requestedLocales =
		configured === true || configured.locales === undefined
			? globalLocaleCodes
			: configured.locales;
	const duplicateLocale = requestedLocales.find(
		(locale, index) => requestedLocales.indexOf(locale) !== index,
	);

	if (duplicateLocale !== undefined) {
		throw new Error(
			translate("server:core.config.collection.locale.duplicate", {
				data: {
					collection: collection.key,
					locale: duplicateLocale,
				},
			}),
		);
	}

	for (const locale of requestedLocales) {
		if (globalLocaleCodes.includes(locale)) continue;
		throw new Error(
			translate("server:core.config.collection.locale.not.found", {
				data: { collection: collection.key, locale },
			}),
		);
	}

	const defaultLocale =
		configured === true
			? localization.defaultLocale
			: (configured.defaultLocale ?? localization.defaultLocale);

	if (!requestedLocales.includes(defaultLocale)) {
		throw new Error(
			translate("server:core.config.collection.default.locale.not.found", {
				data: {
					collection: collection.key,
					locale: defaultLocale,
				},
			}),
		);
	}
};

export default checkCollectionLocalization;
