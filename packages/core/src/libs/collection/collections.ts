import type { ServiceFn } from "../../utils/services/types.js";
import { copy } from "../i18n/index.js";
import type BrickBuilder from "./builders/brick-builder/index.js";
import type { BrickTypes } from "./builders/brick-builder/types.js";
import type CollectionBuilder from "./builders/collection-builder/index.js";

type GetAllParams = Record<string, never>;

type GetSingleParams = {
	key: string;
};

type GetBricksParams = {
	collection: CollectionBuilder;
	type?: BrickTypes;
};

type GetBrickParams = GetBricksParams & {
	key: string;
};

type Collections = {
	/** Returns every collection available to the current service context. */
	getAll: ServiceFn<[params: GetAllParams], CollectionBuilder[]>;
	/** Returns the collection registered under the given stable key. */
	getSingle: ServiceFn<[params: GetSingleParams], CollectionBuilder>;
	/** Returns a collection's bricks, optionally limited to one brick type. */
	getBricks: ServiceFn<[params: GetBricksParams], BrickBuilder[]>;
	/** Returns a collection brick by key, optionally limited to one brick type. */
	getBrick: ServiceFn<[params: GetBrickParams], BrickBuilder | undefined>;
};

const collections: Collections = {
	async getAll(context, _params) {
		return {
			error: undefined,
			data: context.config.collections ?? [],
		};
	},
	async getSingle(context, params) {
		const collectionsRes = await collections.getAll(context, {});
		if (collectionsRes.error) return collectionsRes;

		const collection = collectionsRes.data.find(
			(candidate) => candidate.key === params.key,
		);

		if (collection === undefined) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.collections.not.found.message"),
					status: 404,
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: collection,
		};
	},
	async getBricks(_context, params) {
		if (params.type === "builder") {
			return {
				error: undefined,
				data: params.collection.config.bricks?.builder ?? [],
			};
		}
		if (params.type === "fixed") {
			return {
				error: undefined,
				data: params.collection.config.bricks?.fixed ?? [],
			};
		}
		return {
			error: undefined,
			data: [
				...(params.collection.config.bricks?.builder ?? []),
				...(params.collection.config.bricks?.fixed ?? []),
			],
		};
	},
	async getBrick(context, params) {
		const bricksRes = await collections.getBricks(context, params);
		if (bricksRes.error) return bricksRes;

		return {
			error: undefined,
			data: bricksRes.data.find((brick) => brick.key === params.key),
		};
	},
};

export default collections;
