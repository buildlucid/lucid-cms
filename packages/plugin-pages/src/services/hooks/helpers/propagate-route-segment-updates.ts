import {
	getCollectionTableNames,
	resolveRelatedDocumentVersionType,
} from "@lucidcms/core/plugin";
import type { DocumentVersionType, ServiceFn } from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../../../types/types.js";
import checkFullSlugUniqueness from "../../checks/fullslug-uniqueness.js";
import constructChildFullSlug from "../../construct-child-fullslugs.js";
import getDescendantFields from "../../get-descendant-fields.js";
import getRouteSegmentDependents from "../../get-route-segment-dependents.js";
import resolveStoredRoutePrefixes from "../../resolve-stored-route-prefixes.js";
import updateFullSlugFields from "../../update-fullslug-fields.js";

/** Rebuilds page routes that depend on a changed route-segment document. */
const propagateRouteSegmentUpdates: ServiceFn<
	[
		{
			options: PluginOptionsInternal;
			targetCollectionKey: string;
			targetDocumentId: number;
			targetVersionType: Exclude<DocumentVersionType, "revision">;
		},
	],
	undefined
> = async (context, data) => {
	const collectionResults = await Promise.all(
		data.options.collections.map(async (collection) => {
			const relationKeys = collection.segments
				.filter((segment) => segment.collection === data.targetCollectionKey)
				.map((segment) => segment.relation);
			if (relationKeys.length === 0) {
				return { error: undefined, data: undefined };
			}

			const collectionInstance = context.config.collections.find(
				(instance) => instance.key === collection.key,
			);
			if (!collectionInstance) {
				return { error: undefined, data: undefined };
			}

			const versionTypes = [
				"latest",
				...collectionInstance.getData.environments.map(
					(environment) => environment.key,
				),
			].filter((versionType) => {
				return (
					resolveRelatedDocumentVersionType({
						collections: context.config.collections,
						sourceCollectionKey: collection.key,
						sourceVersionType: versionType,
						targetCollectionKey: data.targetCollectionKey,
					}) === data.targetVersionType
				);
			});
			if (versionTypes.length === 0) {
				return { error: undefined, data: undefined };
			}

			const tablesRes = await getCollectionTableNames(context, collection.key);
			if (tablesRes.error) return tablesRes;
			const dependentsRes = await getRouteSegmentDependents(context, {
				collectionKey: collection.key,
				relationKeys,
				targetCollectionKey: data.targetCollectionKey,
				targetDocumentId: data.targetDocumentId,
				versionTypes,
				tables: tablesRes.data,
			});
			if (dependentsRes.error) return dependentsRes;

			const versionResults = await Promise.all(
				versionTypes.map(async (versionType) => {
					const directDependents = dependentsRes.data.filter(
						(dependent) => dependent.version_type === versionType,
					);
					if (directDependents.length === 0) {
						return { error: undefined, data: undefined };
					}

					const descendantsRes = await getDescendantFields(context, {
						ids: directDependents.map((dependent) => dependent.document_id),
						versionType,
						collectionKey: collection.key,
						tables: tablesRes.data,
					});
					if (descendantsRes.error) return descendantsRes;

					const affectedVersions = new Map(
						[...directDependents, ...descendantsRes.data].map((dependent) => [
							dependent.document_version_id,
							dependent,
						]),
					);
					const affected = [...affectedVersions.values()];
					const routePrefixesRes = await resolveStoredRoutePrefixes(context, {
						collection,
						collectionInstance,
						versionType,
						versionIds: affected.map(
							(dependent) => dependent.document_version_id,
						),
					});
					if (routePrefixesRes.error) return routePrefixesRes;

					const fullSlugsRes = constructChildFullSlug({
						descendants: affected,
						localization: context.config.localization,
						collection,
						routePrefixes: routePrefixesRes.data,
					});
					if (fullSlugsRes.error) return fullSlugsRes;

					const uniquenessRes = await checkFullSlugUniqueness(context, {
						collection,
						projectedFullSlugs: fullSlugsRes.data,
						versionType,
						collectionKey: collection.key,
						tables: tablesRes.data,
						excludeDocumentIds: fullSlugsRes.data.map(
							(document) => document.documentId,
						),
					});
					if (uniquenessRes.error) return uniquenessRes;

					return updateFullSlugFields(context, {
						docFullSlugs: fullSlugsRes.data,
						versionType,
						tables: tablesRes.data,
					});
				}),
			);
			const failedVersion = versionResults.find((result) => result.error);
			if (failedVersion?.error) return failedVersion;

			return { error: undefined, data: undefined };
		}),
	);
	const failedCollection = collectionResults.find((result) => result.error);
	if (failedCollection?.error) return failedCollection;

	return { error: undefined, data: undefined };
};

export default propagateRouteSegmentUpdates;
