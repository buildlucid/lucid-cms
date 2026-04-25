export type LocaleValue = Partial<Record<string, string>> | string;

export interface Locale {
	code: string;
	name: string | null;
	isDefault: boolean;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface TranslationsObj {
	localeCode: string;
	value: string | null;
}
