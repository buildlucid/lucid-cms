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
	TranslationValues,
} from "./types.js";

/**
 * Reads one locale's translation, checking own properties so keys such as
 * `constructor` aren't read from the prototype.
 */
const findTranslation = (props: {
	bundles: TranslationBundles;
	locale: string;
	scope: string;
	key: string;
}) => {
	const bundle = Object.hasOwn(props.bundles, props.locale)
		? props.bundles[props.locale]
		: undefined;
	const keys =
		bundle && Object.hasOwn(bundle, props.scope)
			? bundle[props.scope]
			: undefined;
	return keys && Object.hasOwn(keys, props.key) ? keys[props.key] : undefined;
};

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
	const find = (locale: string) =>
		findTranslation({
			bundles: props.bundles,
			locale,
			scope: props.scope,
			key: props.key,
		});
	const translation =
		find(props.locale ?? props.defaultLocale) ??
		find(props.defaultLocale) ??
		find("en") ??
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
	//* literal copy is already written text, so braces without a value stay as written
	if (value.type === "lucid.literal") {
		const values: TranslationValues = {
			...(value.values ?? {}),
			...(props.options?.data ?? {}),
		};
		return value.value.replace(
			/\{\{(\w+)\}\}/g,
			(match, key: string) => values[key]?.toString() ?? match,
		);
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
		lookup: ({ scope, key, locale, data }) => {
			const translation = findTranslation({ bundles, locale, scope, key });
			return translation === undefined
				? undefined
				: formatTranslation(translation, data);
		},
		scopeBundles: (scope) =>
			Object.fromEntries(
				Object.entries(bundles).map(([locale, bundle]) => [
					locale,
					Object.hasOwn(bundle, scope) ? (bundle[scope] ?? {}) : {},
				]),
			),
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
