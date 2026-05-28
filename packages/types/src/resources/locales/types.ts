export type AdminText = {
	type: "admin-text";
	key: string;
	fallback?: string;
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
