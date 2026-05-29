export type LocaleDirection = "ltr" | "rtl";
export type InterfaceDirection = LocaleDirection;

export type TranslationScope = "admin" | "server";

export type TranslationValues = Record<string, string | number | undefined>;

export type TextDescriptor<TScope extends TranslationScope = TranslationScope> =
	{
		type: "lucid.text";
		scope: TScope;
		key: string;
		values?: TranslationValues;
		defaultMessage?: string;
	};

export type LiteralText = {
	type: "lucid.literal";
	value: string;
	values?: TranslationValues;
};

export type AdminTextDescriptor = TextDescriptor<"admin">;
export type ServerTextDescriptor = TextDescriptor<"server">;
export type TranslatableText = TextDescriptor | LiteralText;

export type TranslationBundle = Record<
	TranslationScope,
	Record<string, string>
>;

export type TranslationBundles = Record<string, TranslationBundle>;

export type TranslateOptions = {
	locale?: string;
	defaultMessage?: string;
};

export type TranslateTextOptions = TranslateOptions & {
	values?: TranslationValues;
};

export type TranslateKey = (
	key: string,
	values?: TranslationValues,
	options?: {
		defaultMessage?: string;
	},
) => string;

export type BoundTranslateTextOptions = {
	values?: TranslationValues;
	defaultMessage?: string;
};

export type TranslateText = (
	value: TranslatableText | undefined,
	options?: BoundTranslateTextOptions,
) => string | undefined;

export type TranslatorConfig = {
	i18n: {
		translations: TranslationBundles;
		interface: {
			defaultLocale: string;
		};
	};
};

export type Translator = {
	locale: string;
	server: TranslateKey;
	admin: TranslateKey;
	text: TranslateText;
	english: {
		server: TranslateKey;
		text: TranslateText;
	};
};
