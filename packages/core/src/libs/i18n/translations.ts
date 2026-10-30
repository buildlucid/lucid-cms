import coreEnAdmin from "../../translations/en.admin.json" with { type: "json" };
import coreEnServer from "../../translations/en.server.json" with { type: "json" };
import type {
	TranslationBundle,
	TranslationBundles,
	TranslationValues,
} from "./types.js";

/**
 * Built-in Lucid English translations.
 *
 * Most application code should use `copy`, `translate`, or
 * `createTranslator` instead of reading this object directly.
 */
export const coreTranslations: TranslationBundles = {
	en: {
		admin: coreEnAdmin,
		server: coreEnServer,
	},
};

/**
 * Ensures a partial locale bundle always has admin and server scopes, keeping
 * any other scopes it has.
 *
 * @example
 * ```ts
 * const bundle = normalizeTranslationBundle({
 *   admin: { "collections.posts.name": "Posts" },
 * });
 * ```
 */
export const normalizeTranslationBundle = (
	bundle: Partial<TranslationBundle> | undefined,
): TranslationBundle => {
	const normalized: TranslationBundle = { admin: {}, server: {} };
	for (const [scope, keys] of Object.entries(bundle ?? {})) {
		normalized[scope] = { ...keys };
	}
	return normalized;
};

/**
 * Normalizes all locale bundles so every locale contains admin and server
 * scopes alongside any others.
 *
 * @example
 * ```ts
 * const translations = normalizeTranslationBundles({
 *   fr: { server: { "posts.not.found": "Article introuvable." } },
 * });
 * ```
 */
export const normalizeTranslationBundles = (
	bundles?: Record<string, Partial<TranslationBundle>>,
): TranslationBundles => {
	const normalized: TranslationBundles = {};

	for (const [locale, bundle] of Object.entries(bundles ?? {})) {
		normalized[locale] = normalizeTranslationBundle(bundle);
	}

	return normalized;
};

/**
 * Merges translation bundles in order, with later sources overriding earlier
 * ones.
 *
 * Use this in build tooling when combining generated, plugin, or project
 * translation bundles before creating a translation store.
 *
 * @example
 * ```ts
 * const translations = mergeTranslationBundles(coreTranslations, pluginTranslations);
 * ```
 */
export const mergeTranslationBundles = (
	...sources: Array<Record<string, Partial<TranslationBundle>> | undefined>
): TranslationBundles => {
	const merged: TranslationBundles = {};

	for (const source of sources) {
		for (const [locale, bundle] of Object.entries(source ?? {})) {
			const target = merged[locale] ?? normalizeTranslationBundle(undefined);
			for (const [scope, keys] of Object.entries(bundle)) {
				target[scope] = { ...target[scope], ...keys };
			}
			merged[locale] = target;
		}
	}

	return merged;
};

/**
 * Replaces `{{value}}` placeholders with the provided interpolation data.
 *
 * @example
 * ```ts
 * formatTranslation("Hello {{name}}", { name: "Ada" });
 * ```
 */
export const formatTranslation = (
	translation: string,
	values?: TranslationValues,
) => {
	if (!values) return translation;

	return translation.replace(
		/\{\{(\w+)\}\}/g,
		(_, key) => values[key as keyof TranslationValues]?.toString() ?? "",
	);
};
