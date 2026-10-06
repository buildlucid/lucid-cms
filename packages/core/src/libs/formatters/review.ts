import type { RequestOverview, ReviewOverview } from "../../types/response.js";
import formatter from "./helpers.js";

type CountValue = string | number | undefined;

/**
 * Turns each collection's raw document counts into in sync, out of sync and
 * unreleased counts for every publish target it has.
 */
const formatOverview = (props: {
	collections: Array<{
		key: string;
		targets: string[];
		counts: {
			total: CountValue;
			environments: Array<{
				environment_key: string;
				released: CountValue;
				in_sync: CountValue;
			}>;
		};
	}>;
	requests: RequestOverview;
}): ReviewOverview => {
	return {
		collections: props.collections.map((collection) => {
			const total = formatter.parseCount(collection.counts.total);
			const environments = new Map(
				collection.counts.environments.map((environment) => [
					environment.environment_key,
					environment,
				]),
			);

			return {
				collectionKey: collection.key,
				total,
				targets: collection.targets.map((target) => {
					const environment = environments.get(target);
					const released = formatter.parseCount(environment?.released);
					const inSync = formatter.parseCount(environment?.in_sync);
					return {
						key: target,
						inSync,
						outOfSync: released - inSync,
						unreleased: total - released,
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
