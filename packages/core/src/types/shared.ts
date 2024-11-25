import type constants from "../constants/constants.js";

export type SupportedLocales = (typeof constants.locales)[number];
export type LocaleValue = Partial<Record<SupportedLocales, string>> | string;

export interface TranslationsObj {
	localeCode: string;
	value: string | null;
}
