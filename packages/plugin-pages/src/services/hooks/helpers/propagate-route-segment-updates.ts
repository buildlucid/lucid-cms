import { copy } from "@lucidcms/core";
import {
	getCollectionTableNames,
	resolveRelatedDocumentVersionType,
} from "@lucidcms/core/extension";
import type {
	DocumentVersionType,
	ServiceFn,
	Toolkit,
} from "@lucidcms/core/types";
import type {
	PluginOptionsInternal,
	RouteScope,
} from "../../../types/types.js";
import resolvePagesCollectionLocalization from "../../../utils/resolve-pages-collection-localization.js";
import checkFullSlugUniqueness from "../../checks/fullslug-uniqueness.js";
import constructChildFullSlug from "../../construct-child-fullslugs.js";
import getDescendantFields from "../../get-descendant-fields.js";
import getPagesFields from "../../get-pages-fields.js";
import getRouteSegmentDependents from "../../get-route-segment-dependents.js";
import resolveStoredRoutePrefixes from "../../resolve-stored-route-prefixes.js";
import updateRouteFields from "../../update-route-fields.js";

/**
 * Rebuilds page routes that depend on a changed route-segment document, in
 * latest and every environment. Request proposals read segments from latest
 * and are rebuilt when they are edited or captured instead.
 */
const propagateRouteSegmentUpdates: ServiceFn<
	[
		{
			options: PluginOptionsInternal;
			toolkit: Toolkit;
			targetCollectionKey: string;
		} & (
			| {
					targetDocumentId: number;
					targetVersionType: Exclude<DocumentVersionType, "revision">;
			  }
			| { deletedDocumentIds: number[] }
		),
	],
	undefined
> = async (context, data) => {
	const deletedTargets =
		"deletedDocumentIds" in data
			? {
					collectionKey: data.targetCollectionKey,
					documentIds: data.deletedDocumentIds,
				}
			: undefined;
	const targetDocumentIds =
		"deletedDocumentIds" in data
			? data.deletedDocumentIds
			: [data.targetDocumentId];
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
				...collectionInstance.getData.publishing.targets.map(
					(environment) => environment.key,
				),
			].filter((versionType) => {
				return (
					"deletedDocumentIds" in data ||
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
				targetDocumentIds,
				versionTypes,
				tables: tablesRes.data,
			});
			if (dependentsRes.error) return dependentsRes;

			const localization = resolvePagesCollectionLocalization({
				localization: context.config.localization,
				collection,
				collectionInstance,
			});

			const versionResults = await Promise.all(
				versionTypes.map(async (versionType) => {
					const directVersionIds = dependentsRes.data.flatMap((dependent) =>
						dependent.version_type === versionType
							? [dependent.document_version_id]
							: [],
					);
					if (directVersionIds.length === 0) {
						return { error: undefined, data: undefined };
					}

					const scope: RouteScope = { type: "version", versionType };
					const directRes = await getPagesFields(context, {
						collectionKey: collection.key,
						scope,
						tables: tablesRes.data,
						versionIds: directVersionIds,
					});
					if (directRes.error) return directRes;

					const descendantsRes = await getDescendantFields(context, {
						ids: directRes.data.map((dependent) => dependent.document_id),
						scope,
						collectionKey: collection.key,
						tables: tablesRes.data,
					});
					if (descendantsRes.error) return descendantsRes;

					const affectedVersions = new Map(
						[...directRes.data, ...descendantsRes.data].map((dependent) => [
							dependent.document_version_id,
							dependent,
						]),
					);
					const affected = [...affectedVersions.values()].filter(
						(dependent) =>
							deletedTargets?.collectionKey !== collection.key ||
							!deletedTargets.documentIds.includes(dependent.document_id),
					);
					const routePrefixesRes = await resolveStoredRoutePrefixes(context, {
						collection,
						collectionInstance,
						versionType,
						excludedTargets: deletedTargets,
						versionIds: affected.map(
							(dependent) => dependent.document_version_id,
						),
					});
					if (routePrefixesRes.error) return routePrefixesRes;

					const fullSlugsRes = constructChildFullSlug({
						descendants: affected,
						localization,
						collection,
						routePrefixes: routePrefixesRes.data,
					});
					if (fullSlugsRes.error) return fullSlugsRes;

					const uniquenessRes = await checkFullSlugUniqueness(context, {
						collection,
						projectedFullSlugs: fullSlugsRes.data,
						duplicateMessage: deletedTargets
							? copy("server:plugin.pages.full.slug.duplicate.on.delete")
							: undefined,
						scope,
						tables: tablesRes.data,
						excludeDocumentIds: fullSlugsRes.data.map(
							(document) => document.documentId,
						),
					});
					if (uniquenessRes.error) return uniquenessRes;

					return updateRouteFields(context, {
						toolkit: data.toolkit,
						collectionKey: collection.key,
						field: "fullSlug",
						excludeDocumentIds:
							collection.key === data.targetCollectionKey
								? targetDocumentIds
								: [],
						values: fullSlugsRes.data,
						scope,
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
