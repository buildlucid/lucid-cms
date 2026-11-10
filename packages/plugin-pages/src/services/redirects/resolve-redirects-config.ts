import type {
	RedirectsConfig,
	RedirectsOptionsInternal,
	RedirectTargetCollection,
} from "../../types/types.js";
import resolveRedirectEnvironments, {
	type EnvironmentSource,
} from "../../utils/resolve-redirect-environments.js";

/** Resolves the redirects collection's targets, environments and locales once the pages collections are known. */
const resolveRedirectsConfig = (
	options: RedirectsOptionsInternal,
	localization: {
		locales: Array<{ code: string; label: string }>;
		defaultLocale: string | null;
	},
	pagesCollections: Array<EnvironmentSource & RedirectTargetCollection>,
): RedirectsConfig => ({
	collections: pagesCollections.map((collection) => ({
		key: collection.key,
		localized: collection.localized,
	})),
	environments: resolveRedirectEnvironments(
		options.environments,
		pagesCollections,
	),
	navigationGroup: options.navigationGroup?.trim() || undefined,
	locales: localization.locales.map((locale) => ({
		code: locale.code,
		label: locale.label,
	})),
	defaultLocale: localization.defaultLocale,
	hasLocaleField: localization.locales.length > 1,
	trackPathChanges: options.trackPathChanges,
});

export default resolveRedirectsConfig;
