import { LucidError } from "@lucidcms/core";
import { PLUGIN_KEY } from "../constants.js";
import type {
	RedirectsPluginOptions,
	RedirectsPluginOptionsInternal,
} from "../types.js";
import resolveEnvironments, {
	type EnvironmentCollection,
} from "../utils/resolve-environments.js";

const resolvePluginOptions = (
	given: RedirectsPluginOptions,
	localization: {
		locales: Array<{ code: string; label: string }>;
		defaultLocale: string;
	},
	availableCollections: EnvironmentCollection[],
): RedirectsPluginOptionsInternal => {
	const collections = [
		...new Set(given.collections.map((key) => key.trim()).filter(Boolean)),
	];
	if (collections.length === 0) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: "Redirects plugin requires at least one target collection.",
		});
	}

	const targetCollections = collections.map((collectionKey) => {
		const collection = availableCollections.find(
			(candidate) => candidate.key === collectionKey,
		);
		if (!collection) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `Redirect target collection '${collectionKey}' was not found.`,
			});
		}
		return collection;
	});

	return {
		collections,
		environments: resolveEnvironments(given.environments, targetCollections),
		navigationGroup: given.navigationGroup?.trim() || undefined,
		locales: localization.locales.map((locale) => ({
			code: locale.code,
			label: locale.label,
		})),
		defaultLocale: localization.defaultLocale,
	};
};

export default resolvePluginOptions;
