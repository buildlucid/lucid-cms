import type { Config } from "../../types/config.js";
import {
	coreTranslations,
	formatTranslation,
	mergeTranslationBundles,
} from "./translations.js";
import type {
	AdminText,
	ServerText,
	TranslateServerOptions,
	TranslationData,
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

/**
 * Translates server/API copy from the server translation bundle.
 * Pass the resolved config so project and plugin translations can override core copy.
 *
 * ```ts
 * translateServer("core.share.links.media.deleted.message", { count: 3 }, { config, locale: "en" })
 * ```
 */
export function translateServer(
	key: string,
	data?: TranslationData,
	options?: TranslateServerOptions,
): string;
export function translateServer(
	key: string,
	data: TranslationData | undefined,
	options?: TranslateServerOptions,
) {
	const bundles = mergeTranslationBundles(
		coreTranslations,
		options?.config?.i18n.translations,
	);
	const defaultLocale = options?.config?.i18n.interface.defaultLocale ?? "en";
	const targetLocale = options?.locale ?? defaultLocale;
	const translation =
		bundles[targetLocale]?.server[key] ??
		bundles[defaultLocale]?.server[key] ??
		bundles.en?.server[key] ??
		key;

	return formatTranslation(translation, data);
}

/**
 * Translates a `serverText(...)` value.
 */
export const translateServerText = (
	text: ServerText,
	options?: TranslateServerOptions,
) => {
	if (text.priority) {
		return formatTranslation(text.priority, text.data);
	}

	const translated = translateServer(text.key, text.data, options);

	if (translated === text.key && text.fallback) {
		return formatTranslation(text.fallback, text.data);
	}

	if (translated === text.key) {
		return text.default;
	}

	return translated;
};

/**
 * Translates an `adminText(...)` value.
 *
 * ```ts
 * translateAdmin(collection.config.name, { config, locale: "en" })
 * ```
 */
export const translateAdmin = (
	text: AdminText,
	options: {
		config?: Pick<Config, "i18n">;
		locale?: string;
		data?: TranslationData;
	},
) => {
	const bundles = mergeTranslationBundles(
		coreTranslations,
		options.config?.i18n.translations,
	);
	const defaultLocale = options.config?.i18n.interface.defaultLocale ?? "en";
	const targetLocale = options?.locale ?? defaultLocale;

	const translation =
		bundles[targetLocale]?.admin[text.key] ??
		bundles[defaultLocale]?.admin[text.key] ??
		bundles.en?.admin[text.key] ??
		text.fallback ??
		text.key;

	return formatTranslation(translation, options?.data);
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
