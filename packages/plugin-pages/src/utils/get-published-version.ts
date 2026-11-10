import type { CollectionDefinition } from "@lucidcms/core/types";

/** The version a site showing `environment` reads from a collection: latest without environments, or null when it lacks this one. */
const getPublishedVersion = (
	collection: CollectionDefinition,
	environment: string,
): string | null => {
	const environments = collection.getData.publishing.environments;
	if (environment === "latest" || environments.length === 0) return "latest";
	return environments.some((item) => item.key === environment)
		? environment
		: null;
};

export default getPublishedVersion;
