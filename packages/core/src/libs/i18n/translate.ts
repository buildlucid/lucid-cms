import type { Config } from "../../types/config.js";
import {
	coreTranslations,
	formatTranslation,
	mergeTranslationBundles,
} from "./translations.js";
import type {
	TranslatableText,
	TranslateOptions,
	TranslateTextOptions,
	TranslationBundles,
	TranslationScope,
	TranslationValues,
	Translator,
	TranslatorConfig,
} from "./types.js";

/**
 * Resolves the interface locale for server/admin copy.
 *
 * Explicit locale values win first, then the browser `Accept-Language` header,
 * then the configured interface default locale.
 */
export const resolveInterfaceLocale = (props: {
	config: Pick<Config, "i18n">;
	locale?: string | null;
	acceptLanguage?: string | null;
}) => {
	const configuredLocales = props.config.i18n.interface.locales.map(
		(locale) => locale.code,
	);

	if (props.locale && configuredLocales.includes(props.locale)) {
		return props.locale;
	}

	for (const acceptedLocale of parseAcceptLanguage(props.acceptLanguage)) {
		if (configuredLocales.includes(acceptedLocale)) return acceptedLocale;
		const baseLocale = acceptedLocale.split("-")[0];
		if (baseLocale && configuredLocales.includes(baseLocale)) return baseLocale;
	}

	return props.config.i18n.interface.defaultLocale;
};

const resolveTranslation = (props: {
	bundles: TranslationBundles;
	defaultLocale: string;
	scope: TranslationScope;
	key: string;
	values?: TranslationValues;
	options?: TranslateOptions;
}) => {
	const targetLocale = props.options?.locale ?? props.defaultLocale;
	const translation =
		props.bundles[targetLocale]?.[props.scope][props.key] ??
		props.bundles[props.defaultLocale]?.[props.scope][props.key] ??
		props.bundles.en?.[props.scope][props.key] ??
		props.options?.defaultMessage ??
		props.key;

	return formatTranslation(translation, props.values);
};

const translateText = (
	value: TranslatableText | undefined,
	props: {
		bundles: TranslationBundles;
		defaultLocale: string;
		options?: TranslateTextOptions;
	},
) => {
	if (!value) return value;
	if (value.type === "lucid.literal") {
		return formatTranslation(value.value, {
			...(value.values ?? {}),
			...(props.options?.values ?? {}),
		});
	}

	return resolveTranslation({
		bundles: props.bundles,
		defaultLocale: props.defaultLocale,
		scope: value.scope,
		key: value.key,
		values: {
			...(value.values ?? {}),
			...(props.options?.values ?? {}),
		},
		options: {
			...props.options,
			defaultMessage: props.options?.defaultMessage ?? value.defaultMessage,
		},
	});
};

const resolveCoreTranslation = (
	scope: TranslationScope,
	key: string,
	values?: TranslationValues,
	options?: TranslateOptions,
) => {
	return resolveTranslation({
		bundles: coreTranslations,
		defaultLocale: "en",
		scope,
		key,
		values,
		options,
	});
};

export const translate = {
	server: (
		key: string,
		values?: TranslationValues,
		options?: TranslateOptions,
	) => resolveCoreTranslation("server", key, values, options),
	admin: (
		key: string,
		values?: TranslationValues,
		options?: TranslateOptions,
	) => resolveCoreTranslation("admin", key, values, options),
	text: (
		value: TranslatableText | undefined,
		options?: TranslateTextOptions,
	) => {
		return translateText(value, {
			bundles: coreTranslations,
			defaultLocale: "en",
			options,
		});
	},
};

export const createTranslator = (props: {
	config: TranslatorConfig;
	locale: string;
}): Translator => {
	const bundles = mergeTranslationBundles(
		coreTranslations,
		props.config.i18n.translations,
	);
	const defaultLocale = props.config.i18n.interface.defaultLocale;
	const translateKey = (
		scope: TranslationScope,
		locale: string,
		key: string,
		values?: TranslationValues,
		options?: { defaultMessage?: string },
	) =>
		resolveTranslation({
			bundles,
			defaultLocale,
			scope,
			key,
			values,
			options: { ...options, locale },
		});
	const translateBoundText = (
		locale: string,
		value: TranslatableText | undefined,
		options?: TranslateTextOptions,
	) =>
		translateText(value, {
			bundles,
			defaultLocale,
			options: { ...options, locale },
		});

	return {
		locale: props.locale,
		server: (key, values, options) =>
			translateKey("server", props.locale, key, values, options),
		admin: (key, values, options) =>
			translateKey("admin", props.locale, key, values, options),
		text: (value, options) => translateBoundText(props.locale, value, options),
		english: {
			server: (key, values, options) =>
				translateKey("server", "en", key, values, options),
			text: (value, options) => translateBoundText("en", value, options),
		},
	};
};

/**
 * Parses an `Accept-Language` header into locale codes ordered by quality.
 */
const parseAcceptLanguage = (header?: string | null) => {
	if (!header) return [];

	return header
		.split(",")
		.map((part) => {
			const [locale, quality] = part.trim().split(/\s*;\s*q=/);
			return {
				locale: locale?.trim(),
				quality: quality ? Number.parseFloat(quality) : 1,
			};
		})
		.filter(
			(item): item is { locale: string; quality: number } =>
				Boolean(item.locale) && Number.isFinite(item.quality),
		)
		.sort((left, right) => right.quality - left.quality)
		.map((item) => item.locale);
};
