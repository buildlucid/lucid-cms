import { type CollectionBuilder, copy } from "@lucidcms/core";
import type {
	CollectionTableNames,
	RequestCheckBlocker,
	ServiceFn,
} from "@lucidcms/core/types";
import type { CollectionConfig } from "../types/types.js";
import findRouteConflicts from "./find-route-conflicts.js";
import projectRequestTargetDescendants from "./project-request-target-descendants.js";
import projectRequestTargetRoutes, {
	type RequestTargetMember,
} from "./project-request-target-routes.js";

/** Reports missing or cyclic parents and duplicate target routes for request pages and their descendants. */
const checkRequestTargetRoutes: ServiceFn<
	[
		{
			collection: CollectionConfig;
			collectionInstance: CollectionBuilder;
			tables: CollectionTableNames;
			target: string;
			members: RequestTargetMember[];
		},
	],
	RequestCheckBlocker[]
> = async (context, data) => {
	const projectionRes = await projectRequestTargetRoutes(context, data);
	if (projectionRes.error) return projectionRes;
	const projection = projectionRes.data;

	const blockers: RequestCheckBlocker[] = projection.problems.map(
		(problem) => ({ ...problem, target: data.target }),
	);
	const memberIds = new Map(
		data.members.map((member) => [member.documentId, member.requestDocumentId]),
	);

	const descendantsRes = await projectRequestTargetDescendants(context, {
		...data,
		projection,
	});
	if (descendantsRes.error) return descendantsRes;
	const rootOf = new Map(
		descendantsRes.data.map((document) => [
			document.documentId,
			document.rootDocumentId,
		]),
	);
	const projected = [...projection.projected, ...descendantsRes.data];

	const conflictsRes = await findRouteConflicts(context, {
		collection: data.collection,
		projectedFullSlugs: projected,
		scope: projection.scope,
		tables: data.tables,
		excludeDocumentIds: projected.map((document) => document.documentId),
	});
	if (conflictsRes.error) return conflictsRes;

	const seen = new Set<string>();
	for (const conflict of conflictsRes.data) {
		const requestDocumentId = memberIds.get(
			rootOf.get(conflict.documentId) ?? conflict.documentId,
		);
		if (requestDocumentId === undefined) continue;
		const message = context.translate(
			copy("server:plugin.pages.request.route.duplicate", {
				data: { route: conflict.fullSlug, target: data.target },
			}),
		);
		if (seen.has(`${requestDocumentId}:${message}`)) continue;
		seen.add(`${requestDocumentId}:${message}`);
		blockers.push({ requestDocumentId, target: data.target, message });
	}

	return { error: undefined, data: blockers };
};

export default checkRequestTargetRoutes;
