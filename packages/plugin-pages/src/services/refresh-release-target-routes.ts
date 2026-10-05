import { type CollectionBuilder, copy } from "@lucidcms/core";
import type {
	CollectionTableNames,
	FieldInputSchema,
	ServiceFn,
	Toolkit,
} from "@lucidcms/core/types";
import constants from "../constants.js";
import type {
	CollectionConfig,
	ProjectedFullSlug,
	RouteScope,
} from "../types/types.js";
import resolvePagesCollectionLocalization from "../utils/resolve-pages-collection-localization.js";
import findRouteConflicts from "./find-route-conflicts.js";
import buildDescendantFullSlugs from "./hooks/helpers/build-descendant-full-slugs.js";
import projectReleaseTargetRoutes, {
	type ReleaseTargetMember,
} from "./project-release-target-routes.js";
import updateRouteFields from "./update-route-fields.js";

/**
 * Writes the routes of a release's pages once they are all published to one
 * environment. Every page is projected first, so the order they were added in
 * does not matter, then each page's environment descendants are rebuilt once
 * from the top-most released page above them. Routes are checked for
 * uniqueness together before anything is written.
 */
const refreshReleaseTargetRoutes: ServiceFn<
	[
		{
			collection: CollectionConfig;
			collectionInstance: CollectionBuilder;
			tables: CollectionTableNames;
			toolkit: Toolkit;
			target: string;
			members: ReleaseTargetMember[];
		},
	],
	undefined
> = async (context, data) => {
	const projectionRes = await projectReleaseTargetRoutes(context, data);
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
	const projectedById = new Map(
		projection.projected.map((document) => [document.documentId, document]),
	);

	const descendants: ProjectedFullSlug[] = [];
	for (const root of projection.roots) {
		const route = projectedById.get(root);
		if (!route) continue;

		const parentFullSlugField: FieldInputSchema = {
			key: constants.fields.fullSlug.key,
			type: "text",
			...(localization.enabled
				? {
						translations: Object.fromEntries(
							[...route.values].filter(([locale]) => locale !== null),
						),
					}
				: { value: route.values.get(null) ?? null }),
		};
		const descendantsRes = await buildDescendantFullSlugs(context, {
			documentIds: [root],
			scope,
			tables: data.tables,
			collection: data.collection,
			collectionInstance: data.collectionInstance,
			parentFullSlugField,
		});
		if (descendantsRes.error) return descendantsRes;

		//* released pages below the root already hold their projected route
		descendants.push(
			...descendantsRes.data.filter(
				(document) => !memberIds.has(document.documentId),
			),
		);
	}

	const projected = [...projection.projected, ...descendants];
	const conflictsRes = await findRouteConflicts(context, {
		collection: data.collection,
		projectedFullSlugs: projected,
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
				message: copy("server:plugin.pages.release.route.duplicate", {
					data: { route: conflict.fullSlug, target: data.target },
				}),
			},
			data: undefined,
		};
	}

	//* released slugs are stored as typed, so normalise them like a save would
	const slugsRes = await updateRouteFields(context, {
		toolkit: data.toolkit,
		collectionKey: data.collection.key,
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
		collectionKey: data.collection.key,
		field: "fullSlug",
		scope,
		excludeDocumentIds: [...memberIds],
		values: projected,
		tables: data.tables,
	});
};

export default refreshReleaseTargetRoutes;
