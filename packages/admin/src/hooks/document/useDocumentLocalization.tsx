import type { Collection, Locale } from "@types";
import {
	type Accessor,
	createContext,
	createEffect,
	createMemo,
	type ParentComponent,
	useContext,
} from "solid-js";
import contentLocaleStore from "@/store/contentLocaleStore";
import { getDefaultTranslationLocale } from "@/utils/translation-helpers";

type CollectionLocalization = Collection["localized"] | undefined;

/**
 * Narrows the project locale catalogue to the locales exposed by a collection
 * and marks the collection default for existing translation helpers.
 */
export const resolveCollectionContentLocales = (
	locales: Locale[],
	localization: CollectionLocalization,
): Locale[] => {
	if (localization) {
		const supportedLocales = new Set(localization.locales);
		return locales
			.filter((locale) => supportedLocales.has(locale.code))
			.map((locale) => ({
				...locale,
				isDefault: locale.code === localization.defaultLocale,
			}));
	}

	const defaultLocale =
		locales.find((locale) => locale.isDefault) ?? locales[0];
	return defaultLocale ? [{ ...defaultLocale, isDefault: true }] : [];
};

export const createDocumentLocalization = (
	collection: Accessor<Collection | undefined>,
) => {
	const locales = createMemo(() =>
		resolveCollectionContentLocales(
			contentLocaleStore.get.locales,
			collection()?.localized,
		),
	);
	const defaultLocale = createMemo(() =>
		getDefaultTranslationLocale(locales()),
	);
	const contentLocale = createMemo(() => {
		const activeLocale = contentLocaleStore.get.contentLocale;
		if (locales().some((locale) => locale.code === activeLocale)) {
			return activeLocale ?? defaultLocale();
		}
		return defaultLocale();
	});
	const localeCodes = createMemo(() => locales().map((locale) => locale.code));

	return { locales, localeCodes, defaultLocale, contentLocale };
};

type DocumentLocalizationContextValue = ReturnType<
	typeof createDocumentLocalization
>;

const DocumentLocalizationContext =
	createContext<DocumentLocalizationContextValue>();

export const DocumentLocalizationProvider: ParentComponent<{
	collection: Accessor<Collection | undefined>;
}> = (props) => {
	const localization = createDocumentLocalization(props.collection);

	createEffect(() => {
		if (!props.collection()) return;
		const activeLocale = contentLocaleStore.get.contentLocale;
		if (activeLocale === localization.contentLocale()) return;
		contentLocaleStore.get.setContentLocale(localization.contentLocale());
	});

	return (
		<DocumentLocalizationContext.Provider value={localization}>
			{props.children}
		</DocumentLocalizationContext.Provider>
	);
};

export const useDocumentLocalization = () => {
	const context = useContext(DocumentLocalizationContext);
	if (context) return context;

	const defaultLocale = () =>
		getDefaultTranslationLocale(contentLocaleStore.get.locales);
	return {
		locales: () => contentLocaleStore.get.locales,
		localeCodes: () =>
			contentLocaleStore.get.locales.map((locale) => locale.code),
		defaultLocale,
		contentLocale: () =>
			contentLocaleStore.get.contentLocale ?? defaultLocale(),
	};
};
