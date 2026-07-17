import type { Config } from "../../../types.js";
import { translate } from "../../i18n/index.js";

const latestVersionType = "latest";

/**
 * Ensures configured collection version mappings point at known collections and
 * versions before cross-collection reads resolve against them at runtime.
 */
const checkCollectionEnvironmentVersionMap = (config: Config) => {
	const collectionsByKey = new Map(
		config.collections.map((collection) => [collection.key, collection]),
	);

	for (const collection of config.collections) {
		for (const environment of collection.getData.environments) {
			for (const [targetCollectionKey, targetVersionType] of Object.entries(
				environment.collectionVersions ?? {},
			)) {
				const targetCollection = collectionsByKey.get(targetCollectionKey);

				if (!targetCollection) {
					throw new Error(
						translate(
							"server:core.config.collection.environment.version.map.collection.not.found",
							{
								data: {
									collection: collection.key,
									environment: environment.key,
									targetCollection: targetCollectionKey,
								},
							},
						),
					);
				}

				if (targetVersionType === latestVersionType) continue;

				const targetEnvironmentExists =
					targetCollection.getData.environments.some(
						(targetEnvironment) => targetEnvironment.key === targetVersionType,
					);

				if (!targetEnvironmentExists) {
					throw new Error(
						translate(
							"server:core.config.collection.environment.version.map.target.not.found",
							{
								data: {
									collection: collection.key,
									environment: environment.key,
									targetCollection: targetCollectionKey,
									targetVersion: targetVersionType,
								},
							},
						),
					);
				}
			}
		}
	}
};

export default checkCollectionEnvironmentVersionMap;
