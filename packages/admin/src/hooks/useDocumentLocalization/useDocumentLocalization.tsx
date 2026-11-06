import type { Collection, Locale } from "@types";
import {
	type Accessor,
	createContext,
	createEffect,
	createMemo,
	on,
	type ParentComponent,
	useContext,
} from "solid-js";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
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
	/** The locales a locale-limited request's proposal can change. Null when every locale can. Other locales can still be viewed. */
	editableLocales: Accessor<string[] | null> = () => null,
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
		return editableLocales()?.[0] ?? defaultLocale();
	});
	const localeCodes = createMemo(() => locales().map((locale) => locale.code));

	return {
		locales,
		localeCodes,
		defaultLocale,
		contentLocale,
		editableLocales,
	};
};

type DocumentLocalizationContextValue = ReturnType<
	typeof createDocumentLocalization
>;

const DocumentLocalizationContext =
	createContext<DocumentLocalizationContextValue>();

export const DocumentLocalizationProvider: ParentComponent<{
	collection: Accessor<Collection | undefined>;
	editableLocales?: Accessor<string[] | null>;
}> = (props) => {
	const localization = createDocumentLocalization(
		props.collection,
		props.editableLocales,
	);

	createEffect(() => {
		if (!props.collection()) return;
		const activeLocale = contentLocaleStore.get.contentLocale;
		if (activeLocale === localization.contentLocale()) return;
		contentLocaleStore.get.setContentLocale(localization.contentLocale());
	});
	//* a locale-limited proposal opens in a locale it changes, once, so other locales can still be viewed
	createEffect(
		on(
			() => localization.editableLocales()?.join(",") ?? null,
			() => {
				const editable = localization.editableLocales();
				const first = editable?.[0];
				if (
					!first ||
					editable.includes(contentLocaleStore.get.contentLocale ?? "")
				) {
					return;
				}
				contentLocaleStore.get.setContentLocale(first);
			},
		),
	);

	return (
		<DocumentLocalizationContext.Provider value={localization}>
			{props.children}
		</DocumentLocalizationContext.Provider>
	);
};

/**
 * Shows read-only content, optionally in another locale without changing the
 * editor's, eg. the source text beside a translation. Nothing in it can be
 * edited, so it isn't limited to a request's locales.
 */
export const DocumentLocaleOverride: ParentComponent<{
	locale: Accessor<string | undefined>;
}> = (props) => {
	const parent = useDocumentLocalization();

	return (
		<DocumentLocalizationContext.Provider
			value={{
				...parent,
				contentLocale: () => props.locale() ?? parent.contentLocale(),
				editableLocales: () => null,
			}}
		>
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
		editableLocales: () => null,
	};
};
