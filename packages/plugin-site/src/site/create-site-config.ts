import { LucidError, logger } from "@lucidcms/core";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../constants.js";
import type { SiteLocaleContext, SitePluginOptions } from "../types.js";
import getCollectionVersion from "./get-collection-version.js";

/** What the site reads from Lucid's config: its locales and each collection's version. */
export type SiteConfig = {
	/** The CMS's collections, whose field configs preview targets follow. */
	collections: ResolvedLucidConfig["collections"];
	/** The content locales the site renders. */
	locales: ReadonlySet<string>;
	defaultLocale: string;
	/** The locale a render reads, from the `locale` option or the default locale. */
	resolveLocale: (context: SiteLocaleContext) => string;
	/** The version templates read, warning once when the collection isn't on the site. */
	getVersion: (collectionKey: string, requested?: string) => string | null;
	/** The collection's site version without the warning, for checks across every collection. */
	siteVersion: (collectionKey: string) => string | null;
};

/** Rejects site locales absent from the CMS or unsupported by `Intl` for rendering dates and numbers. */
const checkLocales = (locales: string[], cmsLocales: Set<string>) => {
	for (const code of locales) {
		if (!cmsLocales.has(code)) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `The site locale '${code}' isn't one of the CMS's content locales.`,
			});
		}
		try {
			Intl.getCanonicalLocales(code);
		} catch {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `The site locale '${code}' isn't a language tag Intl can format dates and numbers for, such as 'en' or 'en-GB'.`,
			});
		}
	}
};

const createSiteConfig = (
	config: ResolvedLucidConfig,
	options: Pick<SitePluginOptions, "locales" | "locale">,
	siteEnvironment: string | null,
): SiteConfig => {
	const cmsLocales = config.localization.locales.map((locale) => locale.code);
	const codes = options.locales ?? cmsLocales;
	checkLocales(codes, new Set(cmsLocales));
	const locales = new Set(codes);
	const cmsDefault = config.localization.defaultLocale;
	const defaultLocale =
		cmsDefault !== null && locales.has(cmsDefault)
			? cmsDefault
			: (codes[0] ?? cmsDefault ?? "en");
	if (locales.size > 1 && !options.locale) {
		logger.warn({
			scope: PLUGIN_KEY,
			event: "plugin-site.locale.missing",
			dedupeKey: `${PLUGIN_KEY}:locale-missing`,
			message: `The site has ${locales.size} locales but no locale option, so every page renders in '${defaultLocale}'.`,
		});
	}

	const siteVersion = (collectionKey: string) => {
		const collection = config.collections.find(
			(item) => item.key === collectionKey,
		);
		if (!collection) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `There is no '${collectionKey}' collection.`,
			});
		}
		return getCollectionVersion(collection, siteEnvironment);
	};

	return {
		collections: config.collections,
		locales,
		defaultLocale,
		resolveLocale: (context) => {
			if (!options.locale) return defaultLocale;

			const locale = options.locale(context);
			if (!locales.has(locale)) {
				throw new LucidError({
					scope: PLUGIN_KEY,
					message: `The locale option gave '${locale}' for ${context.path || "/"}, which isn't one of the site's locales.`,
				});
			}
			return locale;
		},
		siteVersion,
		getVersion: (collectionKey, requested) => {
			const version = siteVersion(collectionKey);
			if (requested !== undefined) return requested;
			if (version === null) {
				logger.warn({
					scope: PLUGIN_KEY,
					event: "plugin-site.collection.not-on-site",
					dedupeKey: `${PLUGIN_KEY}:not-on-site:${collectionKey}`,
					message: `The '${collectionKey}' collection has no '${siteEnvironment}' environment, so the site shows none of its documents.`,
				});
			}
			return version;
		},
	};
};

export default createSiteConfig;
