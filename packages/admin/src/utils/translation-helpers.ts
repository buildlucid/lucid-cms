import type { Locale } from "@types";
import type { Setter } from "solid-js";

export type TranslationValue = {
	localeCode: string | null;
	value: string | null;
};

type LocaleConfig = Pick<Locale, "code" | "isDefault">;

/**
 * Picks the configured default locale for editable translation rows.
 */
export const getDefaultTranslationLocale = (locales: LocaleConfig[]) => {
	return (
		locales.find((locale) => locale.isDefault)?.code ?? locales[0]?.code ?? "en"
	);
};

/**
 * Creates an empty translation row for every configured locale.
 */
export const createDefaultTranslations = <
	T extends TranslationValue = TranslationValue,
>(
	locales: LocaleConfig[],
): T[] =>
	(locales.length > 0
		? locales
		: [{ code: getDefaultTranslationLocale(locales), isDefault: true }]
	).map((locale) => ({
		localeCode: locale.code,
		value: null,
	})) as T[];

/**
 * Converts config-shaped locale records into editable translation rows.
 */
export const recordToTranslations = <
	T extends TranslationValue = TranslationValue,
>(
	locales: LocaleConfig[],
	record?: Record<string, string>,
): T[] =>
	createDefaultTranslations<T>(locales).map((translation) => ({
		...translation,
		value: translation.localeCode
			? (record?.[translation.localeCode] ?? null)
			: null,
	}));

/**
 * Merges persisted translation rows into the currently configured locales.
 */
export const mergeTranslations = <
	T extends TranslationValue = TranslationValue,
>(params: {
	translations?: T[];
	locales: LocaleConfig[];
	fallbackValue?: string | null;
}): T[] => {
	const defaultLocale = getDefaultTranslationLocale(params.locales);

	return createDefaultTranslations<T>(params.locales).map((translation) => ({
		...translation,
		value:
			params.translations?.find(
				(item) => item.localeCode === translation.localeCode,
			)?.value ??
			(translation.localeCode === defaultLocale
				? (params.fallbackValue ?? null)
				: null),
	}));
};

/**
 * Reads a translation value for the active locale selector.
 */
export const getTranslation = (
	translations?: TranslationValue[],
	contentLocale?: string,
) => {
	const translation = translations?.find((t) => t.localeCode === contentLocale);
	return translation?.value ?? null;
};

/**
 * Updates one locale row while preserving the rest of the translation array.
 */
export const updateTranslation = <T extends TranslationValue>(
	setter: Setter<T[]> | undefined,
	translation: T | undefined,
) => {
	if (!setter) return;
	if (!translation) return;
	setter((prev) => {
		const index = prev.findIndex(
			(item) => item.localeCode === translation.localeCode,
		);
		if (index === -1) return [...prev, translation];

		return prev.map((item) =>
			item.localeCode === translation.localeCode ? translation : item,
		);
	});
};
