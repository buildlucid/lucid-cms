import type { Config } from "../../types/config.js";
import { createTranslationStore } from "./store.js";
import type {
	TranslatableCopy,
	TranslateCopy,
	TranslateCopyOptions,
	TranslationStore,
	Translator,
} from "./types.js";

const coreTranslationStore = createTranslationStore({
	defaultLocale: "en",
	bundles: {},
});

/**
 * Resolves the interface locale for server/admin copy.
 *
 * Explicit locale values win first, then the browser `Accept-Language` header,
 * then the configured interface default locale.
 *
 * @example
 * ```ts
 * const locale = resolveInterfaceLocale({
 *   config,
 *   acceptLanguage: request.headers.get("accept-language"),
 * });
 * ```
 */
export const resolveInterfaceLocale = (props: {
	config: Pick<Config, "i18n">;
	locale?: string | null;
	acceptLanguage?: string | null;
}) => {
	const configuredLocales = props.config.i18n.locales.map(
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

	return props.config.i18n.defaultLocale;
};

/**
 * Resolves Lucid core translations without project or plugin overrides.
 *
 * Use this for build-time, CLI, or low-level code that does not have a processed
 * config available. For request, service, lifecycle, and plugin code that should
 * respect project translations, use `createTranslator`.
 *
 * @example
 * ```ts
 * import { translate } from "@lucidcms/core";
 *
 * throw new Error(
 *   translate("server:core.config.duplicate.keys", {
 *     data: { builder: "collections" },
 *   }),
 * );
 * ```
 */
export function translate(
	value: string | TranslatableCopy,
	options?: TranslateCopyOptions,
): string;
export function translate(
	value: undefined,
	options?: TranslateCopyOptions,
): undefined;
export function translate(
	value: string | TranslatableCopy | undefined,
	options?: TranslateCopyOptions,
): string | undefined;
export function translate(
	value: string | TranslatableCopy | undefined,
	options?: TranslateCopyOptions,
) {
	return coreTranslationStore.copy(value, {
		locale: options?.locale,
		options: {
			data: options?.data,
			defaultMessage: options?.defaultMessage,
		},
	});
}

/**
 * Creates a translator bound to a translation store and locale.
 *
 * Use this at request, service, adapter lifecycle, cron, and job boundaries when
 * text should respect project and plugin translation overrides. The returned
 * translator resolves prefixed keys or any value created with `copy`.
 *
 * @example
 * ```ts
 * import { copy, createTranslator } from "@lucidcms/core";
 *
 * const translator = createTranslator({ store, locale: "fr" });
 *
 * translator("server:posts.not.found", {
 *   data: { id: 12 },
 *   defaultMessage: "Post {{id}} was not found.",
 * });
 *
 * translator(copy("admin:collections.posts.name", {
 *   defaultMessage: "Posts",
 * }));
 * ```
 */
export const createTranslator = (props: {
	store: TranslationStore;
	locale: string;
}): Translator => {
	const translateBoundCopy = (
		locale: string,
		value: string | TranslatableCopy | undefined,
		options?: TranslateCopyOptions,
	) =>
		props.store.copy(value, {
			locale,
			options,
		});
	const boundTranslate = ((
		value: string | TranslatableCopy | undefined,
		options?: TranslateCopyOptions,
	) => translateBoundCopy(props.locale, value, options)) as TranslateCopy;
	const englishTranslate = ((
		value: string | TranslatableCopy | undefined,
		options?: TranslateCopyOptions,
	) => translateBoundCopy("en", value, options)) as TranslateCopy;

	return Object.assign(boundTranslate, {
		locale: props.locale,
		forLocale: (locale: string) =>
			createTranslator({
				store: props.store,
				locale,
			}),
		adminBundle: () => props.store.admin({ locale: props.locale }),
		english: englishTranslate,
	});
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
