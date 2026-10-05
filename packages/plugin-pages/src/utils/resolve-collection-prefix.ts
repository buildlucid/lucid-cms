import type { CollectionConfig } from "../types/types.js";
import formatFullSlug from "./format-fullslug.js";

/** Resolves a collection's static route prefix for a locale, formatted like a stored route, eg. `/blog`. */
const resolveCollectionPrefix = (data: {
	collection: CollectionConfig;
	localeCode: string | null;
}): string | undefined => {
	const prefix =
		typeof data.collection.prefix === "string"
			? data.collection.prefix
			: data.localeCode === null
				? undefined
				: data.collection.prefix?.[data.localeCode];

	return formatFullSlug(prefix) ?? undefined;
};

export default resolveCollectionPrefix;
