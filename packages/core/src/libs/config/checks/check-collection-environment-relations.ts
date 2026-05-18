import T from "../../../translations/index.js";
import type { Config } from "../../../types.js";

const latestVersionType = "latest";

/**
 * Ensures configured relation target mappings point at known collections and
 * versions before document refs try to resolve against them at runtime.
 */
const checkCollectionEnvironmentRelations = (config: Config) => {
	const collectionsByKey = new Map(
		config.collections.map((collection) => [collection.key, collection]),
	);

	for (const collection of config.collections) {
		for (const environment of collection.getData.config.environments) {
			for (const [targetCollectionKey, targetVersionType] of Object.entries(
				environment.relations ?? {},
			)) {
				const targetCollection = collectionsByKey.get(targetCollectionKey);

				if (!targetCollection) {
					throw new Error(
						T("config_collection_environment_relation_collection_not_found", {
							collection: collection.key,
							environment: environment.key,
							targetCollection: targetCollectionKey,
						}),
					);
				}

				if (targetVersionType === latestVersionType) continue;

				const targetEnvironmentExists =
					targetCollection.getData.config.environments.some(
						(targetEnvironment) => targetEnvironment.key === targetVersionType,
					);

				if (!targetEnvironmentExists) {
					throw new Error(
						T("config_collection_environment_relation_version_not_found", {
							collection: collection.key,
							environment: environment.key,
							targetCollection: targetCollectionKey,
							targetVersion: targetVersionType,
						}),
					);
				}
			}
		}
	}
};

export default checkCollectionEnvironmentRelations;
