import { type CollectionBuilder, copy } from "@lucidcms/core";
import type {
	CollectionTableNames,
	ServiceFn,
	Toolkit,
} from "@lucidcms/core/types";
import type { CollectionConfig, RouteScope } from "../types/types.js";
import resolvePagesCollectionLocalization from "../utils/resolve-pages-collection-localization.js";
import findRouteConflicts from "./find-route-conflicts.js";
import projectRequestTargetDescendants from "./project-request-target-descendants.js";
import projectRequestTargetRoutes, {
	type RequestTargetMember,
} from "./project-request-target-routes.js";
import updateRouteFields from "./update-route-fields.js";

/**
 * Projects all published request pages before validating uniqueness and writing. Rebuilds
 * environment descendants once from their topmost completed ancestor.
 */
const refreshRequestTargetRoutes: ServiceFn<
	[
		{
			collection: CollectionConfig;
			collectionInstance: CollectionBuilder;
			tables: CollectionTableNames;
			toolkit: Toolkit;
			target: string;
			members: RequestTargetMember[];
		},
	],
	undefined
> = async (context, data) => {
	const projectionRes = await projectRequestTargetRoutes(context, data);
	if (projectionRes.error) return projectionRes;
	const projection = projectionRes.data;

	const problem = projection.problems[0];
	if (problem) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy.literal(problem.message),
			},
			data: undefined,
		};
	}

	const scope: RouteScope = { type: "version", versionType: data.target };
	const localization = resolvePagesCollectionLocalization({
		localization: context.config.localization,
		collection: data.collection,
		collectionInstance: data.collectionInstance,
	});
	const locales = new Set<string | null>(localization.locales);
	const memberIds = new Set(
		projection.members.map((member) => member.document_id),
	);

	const descendantsRes = await projectRequestTargetDescendants(context, {
		...data,
		projection,
	});
	if (descendantsRes.error) return descendantsRes;

	const projected = [...projection.projected, ...descendantsRes.data];
	const conflictsRes = await findRouteConflicts(context, {
		collection: data.collection,
		projectedPaths: projected,
		scope,
		tables: data.tables,
		excludeDocumentIds: projected.map((document) => document.documentId),
	});
	if (conflictsRes.error) return conflictsRes;

	const conflict = conflictsRes.data[0];
	if (conflict) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:plugin.pages.request.route.duplicate", {
					data: { route: conflict.path, target: data.target },
				}),
			},
			data: undefined,
		};
	}

	//* completed slugs are stored as typed, so normalise them like a save would
	const slugsRes = await updateRouteFields(context, {
		toolkit: data.toolkit,
		collection: data.collection,
		field: "slug",
		scope,
		values: projection.members.map((member) => ({
			documentId: member.document_id,
			versionId: member.document_version_id,
			values: new Map(
				member.rows
					.filter((row) => locales.has(row.locale))
					.map((row) => [row.locale, row._slug]),
			),
		})),
		tables: data.tables,
	});
	if (slugsRes.error) return slugsRes;

	return updateRouteFields(context, {
		toolkit: data.toolkit,
		collection: data.collection,
		field: "path",
		scope,
		excludeDocumentIds: [...memberIds],
		values: projected,
		tables: data.tables,
	});
};

export default refreshRequestTargetRoutes;
