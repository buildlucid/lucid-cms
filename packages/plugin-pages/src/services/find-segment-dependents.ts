import type { CollectionBuilder } from "@lucidcms/core";
import {
	getCollectionTableNames,
	resolveRelatedDocumentVersionType,
} from "@lucidcms/core/extension";
import type { CollectionTableNames, ServiceFn } from "@lucidcms/core/types";
import type {
	CollectionConfig,
	PluginOptionsInternal,
} from "../types/types.js";
import getRouteVersionTypes from "../utils/get-route-version-types.js";
import getRouteSegmentDependents, {
	type RouteSegmentDependent,
} from "./get-route-segment-dependents.js";

type CollectionSegmentDependents = {
	collection: CollectionConfig;
	collectionInstance: CollectionBuilder;
	tables: CollectionTableNames;
	dependents: RouteSegmentDependent[];
};

/** Finds non-binned page versions using the documents as route segments, grouped into collections with dependents. */
const findSegmentDependents: ServiceFn<
	[
		{
			options: PluginOptionsInternal;
			collectionKey: string;
			documentIds: number[];
			/** Restricts dependents to versions reading this target, or all version types when omitted, such as on delete. */
			target?: string;
			/** Segment-collection documents to exclude, such as pages being unpublished together. */
			excludeDocumentIds?: number[];
		},
	],
	CollectionSegmentDependents[]
> = async (context, data) => {
	const excluded = new Set(data.excludeDocumentIds);
	const results: CollectionSegmentDependents[] = [];

	for (const collection of data.options.collections) {
		const relationKeys = collection.segments
			.filter((segment) => segment.collection === data.collectionKey)
			.map((segment) => segment.relation);
		const collectionInstance = context.config.collections.find(
			(instance) => instance.key === collection.key,
		);
		if (relationKeys.length === 0 || !collectionInstance) continue;

		const versionTypes = getRouteVersionTypes(collectionInstance).filter(
			(versionType) =>
				data.target === undefined ||
				resolveRelatedDocumentVersionType({
					collections: context.config.collections,
					sourceCollectionKey: collection.key,
					sourceVersionType: versionType,
					targetCollectionKey: data.collectionKey,
				}) === data.target,
		);
		if (versionTypes.length === 0) continue;

		const tablesRes = await getCollectionTableNames(context, collection.key);
		if (tablesRes.error) return tablesRes;

		const dependentsRes = await getRouteSegmentDependents(context, {
			collectionKey: collection.key,
			relationKeys,
			targetCollectionKey: data.collectionKey,
			targetDocumentIds: data.documentIds,
			versionTypes,
			tables: tablesRes.data,
		});
		if (dependentsRes.error) return dependentsRes;

		const dependents = dependentsRes.data.filter(
			(dependent) =>
				collection.key !== data.collectionKey ||
				!excluded.has(dependent.document_id),
		);
		if (dependents.length === 0) continue;

		results.push({
			collection,
			collectionInstance,
			tables: tablesRes.data,
			dependents,
		});
	}

	return { error: undefined, data: results };
};

export default findSegmentDependents;
