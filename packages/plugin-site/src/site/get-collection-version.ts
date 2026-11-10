import type { CollectionDefinition } from "@lucidcms/core/types";

const getCollectionVersion = (
	collection: CollectionDefinition,
	siteEnvironment: string | null,
): string | null => {
	const environments = collection.getData.publishing.environments;
	if (siteEnvironment === "latest" || environments.length === 0) {
		return "latest";
	}
	if (
		siteEnvironment !== null &&
		environments.some((environment) => environment.key === siteEnvironment)
	) {
		return siteEnvironment;
	}
	return null;
};

export default getCollectionVersion;
