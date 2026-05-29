export type TranslationValues = Record<string, string | number | undefined>;

export type AdminTextDescriptor = {
	type: "lucid.text";
	scope: "admin";
	key: string;
	values?: TranslationValues;
	defaultMessage?: string;
};

export interface Locale {
	code: string;
	name: string | null;
	direction: "ltr" | "rtl";
	isDefault: boolean;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface TranslationsObj {
	localeCode: string;
	value: string | null;
}
