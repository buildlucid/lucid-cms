import {
	getCollectionTableNames,
	resolveRelatedDocumentVersionType,
} from "@lucidcms/core/extension";
import type { ServiceFn } from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../types/types.js";
import getRouteSegmentDependents from "./get-route-segment-dependents.js";

/** Finds pages needing the documents' route segments, excluding binned pages and pages being unpublished together in the same collection. */
const findSegmentDependents: ServiceFn<
	[
		{
			options: PluginOptionsInternal;
			collectionKey: string;
			target: string;
			documentIds: number[];
			/** Documents unpublished together, which can't depend on each other. Defaults to `documentIds`. */
			unpublishingIds?: number[];
		},
	],
	Array<{ collectionKey: string; documentId: number }>
> = async (context, data) => {
	const unpublishing = new Set(data.unpublishingIds ?? data.documentIds);
	const dependents: Array<{ collectionKey: string; documentId: number }> = [];

	for (const collection of data.options.collections) {
		const relationKeys = collection.segments
			.filter((segment) => segment.collection === data.collectionKey)
			.map((segment) => segment.relation);
		const collectionInstance = context.config.collections.find(
			(instance) => instance.key === collection.key,
		);
		if (relationKeys.length === 0 || !collectionInstance) continue;

		//* the page versions that read the segment from the target environment
		const versionTypes = [
			"latest",
			...collectionInstance.getData.publishing.targets.map(
				(environment) => environment.key,
			),
		].filter(
			(versionType) =>
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

		for (const documentId of new Set(
			dependentsRes.data.map((dependent) => dependent.document_id),
		)) {
			if (
				collection.key === data.collectionKey &&
				unpublishing.has(documentId)
			) {
				continue;
			}
			dependents.push({ collectionKey: collection.key, documentId });
		}
	}

	return { error: undefined, data: dependents };
};

export default findSegmentDependents;
