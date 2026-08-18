import { LucidError } from "@lucidcms/core";
import { PLUGIN_KEY } from "../constants.js";
import type { RedirectEnvironment } from "../types.js";

export type EnvironmentCollection = {
	key: string;
	environments?: RedirectEnvironment[];
};

const cloneEnvironmentName = (name: RedirectEnvironment["name"]) => {
	if (typeof name === "string") return name;

	return {
		...name,
		...(name.values ? { values: { ...name.values } } : {}),
	};
};

const cloneEnvironment = (
	environment: RedirectEnvironment,
): RedirectEnvironment => ({
	key: environment.key,
	name: cloneEnvironmentName(environment.name),
	...(environment.requires ? { requires: [...environment.requires] } : {}),
});

const cloneConfiguredEnvironment = (
	environment: RedirectEnvironment,
): RedirectEnvironment => ({
	...cloneEnvironment(environment),
	...(environment.collectionVersions
		? { collectionVersions: { ...environment.collectionVersions } }
		: {}),
});

const getEnvironmentSignature = (environments: RedirectEnvironment[] = []) =>
	JSON.stringify(
		environments
			.map((environment) => ({
				key: environment.key,
				requires: [...(environment.requires ?? [])].sort(),
			}))
			.sort((a, b) => a.key.localeCompare(b.key)),
	);

const resolveEnvironments = (
	configured: RedirectEnvironment[] | undefined,
	collections: EnvironmentCollection[],
): RedirectEnvironment[] => {
	if (configured !== undefined) {
		return configured.map(cloneConfiguredEnvironment);
	}

	const reference = collections[0];
	if (!reference) return [];

	const signature = getEnvironmentSignature(reference.environments);
	const mismatched = collections.filter(
		(collection) =>
			getEnvironmentSignature(collection.environments) !== signature,
	);

	if (mismatched.length > 0) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `Cannot infer redirect environments because '${reference.key}' and ${mismatched.map((collection) => `'${collection.key}'`).join(", ")} use different publishing setups. Configure 'environments' explicitly for the redirects plugin.`,
		});
	}

	// Target-specific version maps do not apply to the redirects collection.
	return (reference.environments ?? []).map(cloneEnvironment);
};

export default resolveEnvironments;
