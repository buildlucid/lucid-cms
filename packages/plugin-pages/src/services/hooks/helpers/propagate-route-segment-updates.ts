import { copy } from "@lucidcms/core";
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
import checkPathUniqueness from "../../checks/path-uniqueness.js";
import constructChildPath from "../../construct-child-paths.js";
import findSegmentDependents from "../../find-segment-dependents.js";
import getDescendantFields from "../../get-descendant-fields.js";
import getPagesFields from "../../get-pages-fields.js";
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
	const dependentsRes = await findSegmentDependents(context, {
		options: data.options,
		collectionKey: data.targetCollectionKey,
		documentIds: targetDocumentIds,
		target: "deletedDocumentIds" in data ? undefined : data.targetVersionType,
	});
	if (dependentsRes.error) return dependentsRes;

	const collectionResults = await Promise.all(
		dependentsRes.data.map(
			async ({ collection, collectionInstance, tables, dependents }) => {
				const localization = resolvePagesCollectionLocalization({
					localization: context.config.localization,
					collection,
					collectionInstance,
				});

				const versionResults = await Promise.all(
					[
						...Map.groupBy(dependents, (dependent) => dependent.version_type),
					].map(async ([versionType, versionDependents]) => {
						const directVersionIds = versionDependents.map(
							(dependent) => dependent.document_version_id,
						);

						const scope: RouteScope = { type: "version", versionType };
						const directRes = await getPagesFields(context, {
							collectionKey: collection.key,
							scope,
							tables,
							versionIds: directVersionIds,
						});
						if (directRes.error) return directRes;

						const descendantsRes = await getDescendantFields(context, {
							ids: directRes.data.map((dependent) => dependent.document_id),
							scope,
							collectionKey: collection.key,
							tables,
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

						const pathsRes = constructChildPath({
							descendants: affected,
							localization,
							collection,
							routePrefixes: routePrefixesRes.data,
						});
						if (pathsRes.error) return pathsRes;

						const uniquenessRes = await checkPathUniqueness(context, {
							collection,
							projectedPaths: pathsRes.data,
							duplicateMessage: deletedTargets
								? copy("server:plugin.pages.path.duplicate.on.delete")
								: undefined,
							scope,
							tables,
							excludeDocumentIds: pathsRes.data.map(
								(document) => document.documentId,
							),
						});
						if (uniquenessRes.error) return uniquenessRes;

						return updateRouteFields(context, {
							toolkit: data.toolkit,
							collectionKey: collection.key,
							field: "path",
							excludeDocumentIds:
								collection.key === data.targetCollectionKey
									? targetDocumentIds
									: [],
							values: pathsRes.data,
							scope,
							tables,
						});
					}),
				);
				const failedVersion = versionResults.find((result) => result.error);
				if (failedVersion?.error) return failedVersion;

				return { error: undefined, data: undefined };
			},
		),
	);
	const failedCollection = collectionResults.find((result) => result.error);
	if (failedCollection?.error) return failedCollection;

	return { error: undefined, data: undefined };
};

export default propagateRouteSegmentUpdates;
