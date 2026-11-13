import { copy } from "@lucidcms/core";
import type {
	CollectionDefinition,
	ServiceResponse,
} from "@lucidcms/core/types";

const environmentsOf = (collection: CollectionDefinition) =>
	collection.getData.publishing.environments;

/** Environments no other environment of the collection requires, which is where publishing ends. */
const finalEnvironments = (collection: CollectionDefinition) => {
	const environments = environmentsOf(collection);
	const required = new Set(
		environments.flatMap((environment) => environment.requires),
	);
	return environments
		.filter((environment) => !required.has(environment.key))
		.map((environment) => environment.key);
};

/**
 * Picks the environment to list: the requested one, else the final environment every collection
 * with environments shares, else latest when none have them. Environments are the project's, as
 * the site plugin reads them, so collections the sitemap doesn't list count too, and a sitemap
 * without document collections still lists hook entries for them.
 */
const resolveSitemapEnvironment = (
	collections: CollectionDefinition[],
	requested: string | undefined,
): Awaited<ServiceResponse<string>> => {
	if (requested === "latest") return { error: undefined, data: requested };
	if (requested !== undefined) {
		const known = collections.some((collection) =>
			environmentsOf(collection).some(
				(environment) => environment.key === requested,
			),
		);
		if (!known) {
			return {
				error: {
					type: "basic",
					status: 400,
					message: copy("server:plugin.seo.sitemap.environment.unknown", {
						data: { environment: requested },
					}),
				},
				data: undefined,
			};
		}
		return { error: undefined, data: requested };
	}

	const finals = [...new Set(collections.flatMap(finalEnvironments))];
	const [environment] = finals;
	if (environment === undefined) return { error: undefined, data: "latest" };
	if (finals.length > 1) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:plugin.seo.sitemap.environment.ambiguous", {
					data: { environments: finals.join(", ") },
				}),
			},
			data: undefined,
		};
	}
	return { error: undefined, data: environment };
};

export default resolveSitemapEnvironment;
