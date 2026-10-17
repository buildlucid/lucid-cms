import type { ResolvedLucidConfig } from "@lucidcms/core/types";

type Collection = ResolvedLucidConfig["collections"][number];

const getCollectionVersion = (
	collection: Collection,
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
