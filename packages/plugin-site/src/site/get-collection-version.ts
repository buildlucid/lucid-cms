import type { CollectionBuilder } from "@lucidcms/core";

const getCollectionVersion = (
	collection: CollectionBuilder,
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
