import type { RequestOverview } from "../requests/types.js";

export type ReviewOverview = {
	/** Readable collections with environments. */
	collections: Array<{
		collectionKey: string;
		/** Documents in the collection, not counting requested ones. */
		total: number;
		environments: Array<{
			key: string;
			inSync: number;
			outOfSync: number;
			unreleased: number;
		}>;
	}>;
	requests: RequestOverview;
};
