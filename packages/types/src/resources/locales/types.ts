export type TranslationValues = Record<string, string | number | undefined>;

export type AdminCopyDescriptor = {
	type: "lucid.copy";
	scope: "admin";
	key: string;
	values?: TranslationValues;
	defaultMessage?: string;
};

export type LiteralCopy = {
	type: "lucid.literal";
	value: string;
	values?: TranslationValues;
};

/**
 * Admin copy as it appears in API responses: either a copy descriptor or a
 * literal (a plain string authored in config, normalised internally).
 */
export type ResolvedAdminCopy = AdminCopyDescriptor | LiteralCopy;

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
