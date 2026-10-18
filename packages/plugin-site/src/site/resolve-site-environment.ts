import { type CollectionBuilder, LucidError } from "@lucidcms/core";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../constants.js";

const getFinalEnvironments = (collection: CollectionBuilder) => {
	const environments = collection.getData.publishing.environments;
	const required = new Set(
		environments.flatMap((environment) => environment.requires),
	);
	return environments
		.filter((environment) => !required.has(environment.key))
		.map((environment) => environment.key);
};

const resolveSiteEnvironment = (
	config: ResolvedLucidConfig,
	configured: string | undefined,
): string | null => {
	const published = config.collections.filter(
		(collection) => collection.getData.publishing.environments.length > 0,
	);

	if (configured === "latest") return configured;
	if (configured !== undefined) {
		const known = published.some((collection) =>
			collection.getData.publishing.environments.some(
				(environment) => environment.key === configured,
			),
		);
		if (!known) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `The site plugin's environment '${configured}' isn't an environment of any collection.`,
			});
		}
		return configured;
	}

	const finals = new Set(published.flatMap(getFinalEnvironments));
	if (finals.size === 0) return null;

	const [environment] = finals;
	if (finals.size > 1 || environment === undefined) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `Cannot tell which environment the site shows, because collections end in different environments: ${[...finals].join(", ")}. Set 'environment' in the site plugin.`,
		});
	}
	return environment;
};

export default resolveSiteEnvironment;
