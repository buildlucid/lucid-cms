export type LocaleDirection = "ltr" | "rtl";
export type InterfaceDirection = LocaleDirection;

export type AdminText = {
	type: "admin-text";
	key: string;
	fallback?: string;
};

export type ServerText = {
	type: "server-text";
	key: string;
	default: string;
	priority?: string;
	fallback?: string;
	data?: TranslationData;
};

export type TranslationScope = "admin" | "server";

export type TranslationBundle = Record<
	TranslationScope,
	Record<string, string>
>;

export type TranslationBundles = Record<string, TranslationBundle>;

export type TranslationData = Record<string, string | number | undefined>;

export type TranslateServerOptions = {
	config?: {
		i18n: {
			translations: TranslationBundles;
			interface: {
				defaultLocale: string;
			};
		};
	};
	locale?: string;
};

export type TranslateServer = (
	key: string,
	data: TranslationData | undefined,
	options?: TranslateServerOptions,
) => string;

export type Translator = (
	key: string,
	data?: TranslationData,
	locale?: string,
) => ServerText;
