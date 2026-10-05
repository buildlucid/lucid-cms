import { type CollectionBuilder, copy } from "@lucidcms/core";
import type {
	CollectionTableNames,
	ReleaseCheckBlocker,
	ServiceFn,
} from "@lucidcms/core/types";
import type { CollectionConfig } from "../types/types.js";
import findRouteConflicts from "./find-route-conflicts.js";
import projectReleaseTargetRoutes, {
	type ReleaseTargetMember,
} from "./project-release-target-routes.js";

/**
 * Reports pages a release could not give a valid, unique route in one target
 * environment: a parent missing there, parents that loop, or a route another
 * page outside the release already holds.
 */
const checkReleaseTargetRoutes: ServiceFn<
	[
		{
			collection: CollectionConfig;
			collectionInstance: CollectionBuilder;
			tables: CollectionTableNames;
			target: string;
			members: ReleaseTargetMember[];
		},
	],
	ReleaseCheckBlocker[]
> = async (context, data) => {
	const projectionRes = await projectReleaseTargetRoutes(context, data);
	if (projectionRes.error) return projectionRes;
	const projection = projectionRes.data;

	const blockers: ReleaseCheckBlocker[] = projection.problems.map(
		(problem) => ({ ...problem, target: data.target }),
	);
	const memberIds = new Map(
		data.members.map((member) => [member.documentId, member.releaseDocumentId]),
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
		const releaseDocumentId = memberIds.get(conflict.documentId);
		if (releaseDocumentId === undefined) continue;
		const message = context.translate(
			copy("server:plugin.pages.release.route.duplicate", {
				data: { route: conflict.fullSlug, target: data.target },
			}),
		);
		if (seen.has(`${releaseDocumentId}:${message}`)) continue;
		seen.add(`${releaseDocumentId}:${message}`);
		blockers.push({ releaseDocumentId, target: data.target, message });
	}

	return { error: undefined, data: blockers };
};

export default checkReleaseTargetRoutes;
