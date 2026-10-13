import type { RequestOverview, ReviewOverview } from "../../types/response.js";
import formatter from "./helpers.js";

type CountValue = string | number | undefined;

/** Formats each collection's document counts as in sync, out of sync and unpublished counts per environment. */
const formatOverview = (props: {
	collections: Array<{
		key: string;
		environments: string[];
		counts: {
			total: CountValue;
			environments: Array<{
				environment_key: string;
				published: CountValue;
				in_sync: CountValue;
			}>;
		};
	}>;
	requests: RequestOverview;
}): ReviewOverview => {
	return {
		collections: props.collections.map((collection) => {
			const total = formatter.parseCount(collection.counts.total);
			const counts = new Map(
				collection.counts.environments.map((environment) => [
					environment.environment_key,
					environment,
				]),
			);

			return {
				collectionKey: collection.key,
				total,
				environments: collection.environments.map((key) => {
					const environment = counts.get(key);
					const published = formatter.parseCount(environment?.published);
					const inSync = formatter.parseCount(environment?.in_sync);
					return {
						key,
						inSync,
						outOfSync: published - inSync,
						unpublished: total - published,
					};
				}),
			};
		}),
		requests: props.requests,
	};
};

export default {
	formatOverview,
};
