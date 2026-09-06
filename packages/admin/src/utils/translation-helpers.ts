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
export const getDefaultTranslationLocale = (
	locales: LocaleConfig[],
): string | null => {
	return (
		locales.find((locale) => locale.isDefault)?.code ?? locales[0]?.code ?? null
	);
};

/**
 * Creates an empty translation row for every configured locale.
 */
export const createDefaultTranslations = (
	locales: LocaleConfig[],
): TranslationValue[] =>
	(locales.length > 0
		? locales
		: [{ code: getDefaultTranslationLocale(locales), isDefault: true }]
	).map((locale) => ({
		localeCode: locale.code,
		value: null,
	}));

/**
 * Converts config-shaped locale records into editable translation rows.
 */
export const recordToTranslations = (
	locales: LocaleConfig[],
	record?: string | Record<string, string | null> | null,
): TranslationValue[] =>
	createDefaultTranslations(locales).map((translation) => ({
		...translation,
		value:
			typeof record === "string"
				? translation.localeCode === getDefaultTranslationLocale(locales)
					? record
					: null
				: translation.localeCode === null
					? null
					: (record?.[translation.localeCode] ?? null),
	}));

/**
 * Merges persisted translation rows into the currently configured locales.
 */
export const mergeTranslations = (params: {
	translations?: TranslationValue[];
	locales: LocaleConfig[];
	fallbackValue?: string | null;
}): TranslationValue[] => {
	const defaultLocale = getDefaultTranslationLocale(params.locales);

	return createDefaultTranslations(params.locales).map((translation) => ({
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
	translations?:
		| string
		| TranslationValue[]
		| Record<string, string | null>
		| null,
	contentLocale?: string | null,
) => {
	if (typeof translations === "string") return translations;
	const locale = contentLocale ?? null;
	if (translations && !Array.isArray(translations)) {
		return locale === null ? null : (translations[locale] ?? null);
	}
	const translation = translations?.find((t) => t.localeCode === locale);
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
