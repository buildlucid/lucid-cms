import type CollectionBuilder from "../builders/collection-builder/index.js";
import type { FieldSnapshot } from "../builders/field-builder/types.js";

type CollectionLocalizationSource = {
	locales: Array<{ code: string }>;
	defaultLocale: string | null;
};

type CollectionStorage = {
	/** Locale codes exposed for translated collection content. */
	locales: string[];
	/** The locale used for collection-level defaults and localized content semantics. */
	defaultLocale: string | null;
	/** Shared fields always use the null-locale row, independent of the default language. */
	storageLocale: null;
	/** Locale rows required to persist both localized and non-localized fields. */
	rowLocales: Array<string | null>;
};

export type ResolvedCollectionLocalization = CollectionStorage &
	(
		| { enabled: false; defaultLocale: string | null }
		| { enabled: true; defaultLocale: string }
	);

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
	const storageLocale = null;

	if (configured === false || props.localization.defaultLocale === null) {
		return {
			enabled: false,
			locales: [],
			defaultLocale: props.localization.defaultLocale,
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
			? props.localization.defaultLocale
			: (configured.defaultLocale ?? props.localization.defaultLocale);

	return {
		enabled: true,
		locales,
		defaultLocale,
		storageLocale,
		rowLocales: [null, ...locales],
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
