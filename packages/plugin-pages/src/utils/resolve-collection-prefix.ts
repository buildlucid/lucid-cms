import type { CollectionConfig } from "../types/types.js";
import normalizePathValue from "./normalize-path-value.js";

const normalizePrefix = (
	prefix: string | null | undefined,
): string | undefined => {
	const normalizedPrefix = normalizePathValue(prefix);
	if (!normalizedPrefix) return undefined;

	const trimmed = normalizedPrefix.replace(/^\/+|\/+$/g, "");
	return trimmed.length > 0 ? trimmed : undefined;
};

const resolveCollectionPrefix = (data: {
	collection: CollectionConfig;
	localeCode: string;
}): string | undefined => {
	if (!data.collection.prefix) return undefined;

	if (typeof data.collection.prefix === "string") {
		return normalizePrefix(data.collection.prefix);
	}

	return normalizePrefix(data.collection.prefix[data.localeCode]);
};

export default resolveCollectionPrefix;
