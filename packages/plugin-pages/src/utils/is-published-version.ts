import type { CollectionDefinition } from "@lucidcms/core/types";

/** Whether websites read this version type: an environment, or latest for collections without environments. */
const isPublishedVersion = (
	collection: CollectionDefinition,
	versionType: string,
) => {
	const environments = collection.getData.publishing.environments;
	if (environments.length === 0) return versionType === "latest";
	return environments.some((environment) => environment.key === versionType);
};

export default isPublishedVersion;
