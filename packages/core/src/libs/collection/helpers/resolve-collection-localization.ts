import type CollectionBuilder from "../builders/collection-builder/index.js";
import type { FieldSnapshot } from "../builders/field-builder/types.js";

type CollectionLocalizationSource = {
	locales: Array<{ code: string }>;
	defaultLocale: string;
};

export type ResolvedCollectionLocalization = {
	enabled: boolean;
	/** Locale codes exposed for translated collection content. */
	locales: string[];
	/** The locale used for collection-level defaults and localized content semantics. */
	defaultLocale: string;
	/** The stable project locale used to persist fields that are not localized. */
	storageLocale: string;
	/** Locale rows required to persist both localized and non-localized fields. */
	rowLocales: string[];
};

/**
 * Resolves a collection's localization shorthand against the validated project
 * locale catalogue.
 */
const resolveCollectionLocalization = (props: {
	localization: CollectionLocalizationSource;
	collection: CollectionBuilder;
}): ResolvedCollectionLocalization => {
	const configured = props.collection.config.localized ?? false;
	const globalLocaleCodes = props.localization.locales.map(
		(locale) => locale.code,
	);
	const storageLocale = props.localization.defaultLocale;

	if (configured === false) {
		return {
			enabled: false,
			locales: [],
			defaultLocale: storageLocale,
			storageLocale,
			rowLocales: [storageLocale],
		};
	}

	const requestedLocales =
		configured === true || configured.locales === undefined
			? globalLocaleCodes
			: configured.locales;
	const requestedLocaleSet = new Set(requestedLocales);
	const locales = globalLocaleCodes.filter((locale) =>
		requestedLocaleSet.has(locale),
	);
	const defaultLocale =
		configured === true
			? storageLocale
			: (configured.defaultLocale ?? storageLocale);

	return {
		enabled: true,
		locales,
		defaultLocale,
		storageLocale,
		rowLocales: globalLocaleCodes.filter(
			(locale) => locale === storageLocale || requestedLocaleSet.has(locale),
		),
	};
};

const isCollectionFieldLocalized = (
	localization: Pick<ResolvedCollectionLocalization, "enabled">,
	field: Pick<FieldSnapshot, "config">,
): boolean =>
	localization.enabled &&
	"localized" in field.config &&
	field.config.localized === true;

export { isCollectionFieldLocalized };
export default resolveCollectionLocalization;
