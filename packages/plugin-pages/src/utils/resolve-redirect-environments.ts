import type { CollectionEnvironmentOptions } from "@lucidcms/core/types";

/** A pages collection's key and the environments it publishes to. */
export type EnvironmentSource = {
	key: string;
	environments?: CollectionEnvironmentOptions[];
};

/** Copies an environment, so the redirects collection never shares objects with a pages collection. */
const cloneEnvironment = (
	environment: CollectionEnvironmentOptions,
	requires = environment.requires,
): CollectionEnvironmentOptions => ({
	key: environment.key,
	label:
		typeof environment.label === "string"
			? environment.label
			: {
					...environment.label,
					...(environment.label.values
						? { values: { ...environment.label.values } }
						: {}),
				},
	...(requires && requires.length > 0 ? { requires: [...requires] } : {}),
});

/**
 * Uses explicit redirect environments or merges page environments by key, keeping the first label
 * and common requirements. Omits version maps.
 */
const resolveRedirectEnvironments = (
	configured: CollectionEnvironmentOptions[] | undefined,
	collections: EnvironmentSource[],
): CollectionEnvironmentOptions[] => {
	if (configured !== undefined) {
		return configured.map((environment) => ({
			...cloneEnvironment(environment),
			...(environment.collectionVersions
				? { collectionVersions: { ...environment.collectionVersions } }
				: {}),
		}));
	}

	const merged = new Map<string, CollectionEnvironmentOptions>();
	for (const collection of collections) {
		for (const environment of collection.environments ?? []) {
			const existing = merged.get(environment.key);
			merged.set(
				environment.key,
				existing
					? cloneEnvironment(
							existing,
							existing.requires?.filter((key) =>
								environment.requires?.includes(key),
							),
						)
					: cloneEnvironment(environment),
			);
		}
	}
	return [...merged.values()];
};

export default resolveRedirectEnvironments;
