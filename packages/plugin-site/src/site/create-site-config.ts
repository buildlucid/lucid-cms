import { LucidError, logger } from "@lucidcms/core";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../constants.js";
import type { SiteLocaleContext, SitePluginOptions } from "../types.js";
import getCollectionVersion from "./get-collection-version.js";
import listSiteDomains, { type SiteDomain } from "./list-site-domains.js";

/** What the site reads from Lucid's config: its locales and each collection's version. */
export type SiteConfig = {
	/** The CMS's collections, whose field configs preview targets follow. */
	collections: ResolvedLucidConfig["collections"];
	/** The content locales the site renders. */
	locales: ReadonlySet<string>;
	defaultLocale: string;
	/**
	 * The site's locales by the host of their site URL, the default locale's domain first and each
	 * domain's locales in the site's order with the default locale first. One domain holds every
	 * locale unless `siteUrl` gives them URLs on more than one host.
	 */
	domains: readonly [SiteDomain, ...SiteDomain[]];
	/**
	 * The locale a render reads, one of its domain's: the domain the request's host is on, or the
	 * default locale's. A domain with one locale renders it; otherwise the `locale` option chooses
	 * between them, and without it the first renders.
	 */
	resolveLocale: (context: SiteLocaleContext) => string;
	/** The version templates read, warning once when the collection isn't on the site. */
	getVersion: (collectionKey: string, requested?: string) => string | null;
	/** The collection's site version without the warning, for checks across every collection. */
	siteVersion: (collectionKey: string) => string | null;
	/** The environment the site shows, or latest when no collection has environments. */
	environment: string;
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
	const domains = listSiteDomains(config, [
		defaultLocale,
		...codes.filter((code) => code !== defaultLocale),
	]);
	// Without a locale option, each domain renders its first locale alone.
	const unreached = options.locale
		? []
		: domains.flatMap((domain) => domain.locales.slice(1));
	if (unreached.length > 0 && domains.length > 1) {
		logger.warn({
			scope: PLUGIN_KEY,
			event: "plugin-site.locale.unreached",
			dedupeKey: `${PLUGIN_KEY}:locale-unreached`,
			message: `The site locales ${unreached.map((code) => `'${code}'`).join(", ")} share a domain with another locale in siteUrl, so they never render. Give each its own URL, or set the locale option to choose between them.`,
		});
	} else if (unreached.length > 0) {
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
		domains,
		resolveLocale: (context) => {
			const host = context.url?.host;
			// Hosts siteUrl doesn't name, and renders without a URL, are on the default locale's domain.
			const domain =
				domains.find(
					(item) => host !== undefined && item.hosts.includes(host),
				) ?? domains[0];
			if (!options.locale || domain.locales.length === 1) {
				return domain.locales[0];
			}

			const locale = options.locale(context);
			if (!domain.locales.includes(locale)) {
				throw new LucidError({
					scope: PLUGIN_KEY,
					message:
						domains.length > 1
							? `The locale option gave '${locale}' for ${context.url?.href ?? context.path}, but siteUrl only puts ${domain.locales.map((code) => `'${code}'`).join(", ")} on that domain, so the option can only choose between them.`
							: `The locale option gave '${locale}' for ${context.path || "/"}, which isn't one of the site's locales.`,
				});
			}
			return locale;
		},
		siteVersion,
		environment: siteEnvironment ?? "latest",
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
