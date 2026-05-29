import { parseCopyKey } from "./copy.js";
import {
	coreTranslations,
	formatTranslation,
	mergeTranslationBundles,
	normalizeTranslationBundles,
} from "./translations.js";
import type {
	BoundTranslateCopyOptions,
	BoundTranslateOptions,
	TranslatableCopy,
	TranslationBundles,
	TranslationScope,
	TranslationStore,
} from "./types.js";

/**
 * Resolves one key from the requested locale, then configured default locale,
 * then English, before falling back to `defaultMessage` or the key itself.
 */
const resolveTranslation = (props: {
	bundles: TranslationBundles;
	defaultLocale: string;
	scope: TranslationScope;
	key: string;
	locale?: string;
	options?: BoundTranslateOptions;
}) => {
	const targetLocale = props.locale ?? props.defaultLocale;
	const translation =
		props.bundles[targetLocale]?.[props.scope][props.key] ??
		props.bundles[props.defaultLocale]?.[props.scope][props.key] ??
		props.bundles.en?.[props.scope][props.key] ??
		props.options?.defaultMessage ??
		props.key;

	return formatTranslation(translation, props.options?.data);
};

/**
 * Resolves descriptor values by combining descriptor data with call-site data.
 * Call-site data wins so API boundaries can add or override interpolation.
 */
const translateCopy = (
	value: string | TranslatableCopy | undefined,
	props: {
		bundles: TranslationBundles;
		defaultLocale: string;
		locale?: string;
		options?: BoundTranslateCopyOptions;
	},
) => {
	if (!value) return value;
	if (typeof value === "string") {
		const { scope, key } = parseCopyKey(value);
		return resolveTranslation({
			bundles: props.bundles,
			defaultLocale: props.defaultLocale,
			scope,
			key,
			locale: props.locale,
			options: props.options,
		});
	}
	if (value.type === "lucid.literal") {
		return formatTranslation(value.value, {
			...(value.values ?? {}),
			...(props.options?.data ?? {}),
		});
	}

	return resolveTranslation({
		bundles: props.bundles,
		defaultLocale: props.defaultLocale,
		scope: value.scope,
		key: value.key,
		locale: props.locale,
		options: {
			...props.options,
			data: {
				...(value.values ?? {}),
				...(props.options?.data ?? {}),
			},
			defaultMessage: props.options?.defaultMessage ?? value.defaultMessage,
		},
	});
};

/**
 * Creates the runtime translation store used by request/service translators.
 * Keeping bundles here prevents loaded translation data from becoming part of
 * the general config object that every subsystem receives.
 */
export const createTranslationStore = (props: {
	defaultLocale: string;
	bundles: TranslationBundles;
}): TranslationStore => {
	const bundles = normalizeTranslationBundles(
		mergeTranslationBundles(coreTranslations, props.bundles),
	);

	return {
		defaultLocale: props.defaultLocale,
		bundles,
		resolve: ({ scope, key, locale, options }) =>
			resolveTranslation({
				bundles,
				defaultLocale: props.defaultLocale,
				scope,
				key,
				locale,
				options,
			}),
		copy: (value, copyProps) =>
			translateCopy(value, {
				bundles,
				defaultLocale: props.defaultLocale,
				locale: copyProps?.locale,
				options: copyProps?.options,
			}),
		admin: ({ locale }) => ({
			...(bundles.en?.admin ?? {}),
			...(bundles[props.defaultLocale]?.admin ?? {}),
			...(bundles[locale]?.admin ?? {}),
		}),
	};
};
