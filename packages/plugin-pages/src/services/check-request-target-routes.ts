import { type CollectionBuilder, copy } from "@lucidcms/core";
import type {
	CollectionTableNames,
	RequestCheckBlocker,
	ServiceFn,
} from "@lucidcms/core/types";
import type { CollectionConfig } from "../types/types.js";
import findRouteConflicts from "./find-route-conflicts.js";
import projectRequestTargetRoutes, {
	type RequestTargetMember,
} from "./project-request-target-routes.js";

/**
 * Reports pages a request could not give a valid, unique route in one target
 * environment: a parent missing there, parents that loop, or a route another
 * page outside the request already holds.
 */
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

	const conflictsRes = await findRouteConflicts(context, {
		collection: data.collection,
		projectedFullSlugs: projection.projected,
		scope: projection.scope,
		tables: data.tables,
		excludeDocumentIds: [...memberIds.keys()],
	});
	if (conflictsRes.error) return conflictsRes;

	const seen = new Set<string>();
	for (const conflict of conflictsRes.data) {
		const requestDocumentId = memberIds.get(conflict.documentId);
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
