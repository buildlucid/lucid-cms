import type { CollectionBuilder } from "@lucidcms/core";
import type {
	CollectionTableNames,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../constants.js";
import type {
	CollectionConfig,
	ProjectedFullSlug,
	RouteScope,
} from "../types/types.js";
import resolvePagesCollectionLocalization from "../utils/resolve-pages-collection-localization.js";
import buildDescendantFullSlugs from "./hooks/helpers/build-descendant-full-slugs.js";
import type { RequestTargetProjection } from "./project-request-target-routes.js";

/** Projects descendant routes in the target environment from request roots, excluding request members and associating each route with its root. */
const projectRequestTargetDescendants: ServiceFn<
	[
		{
			collection: CollectionConfig;
			collectionInstance: CollectionBuilder;
			tables: CollectionTableNames;
			target: string;
			projection: RequestTargetProjection;
		},
	],
	Array<ProjectedFullSlug & { rootDocumentId: number }>
> = async (context, data) => {
	const scope: RouteScope = { type: "version", versionType: data.target };
	const localization = resolvePagesCollectionLocalization({
		localization: context.config.localization,
		collection: data.collection,
		collectionInstance: data.collectionInstance,
	});
	const memberIds = new Set(
		data.projection.members.map((member) => member.document_id),
	);
	const projectedById = new Map(
		data.projection.projected.map((document) => [
			document.documentId,
			document,
		]),
	);

	const descendants: Array<ProjectedFullSlug & { rootDocumentId: number }> = [];
	for (const root of data.projection.roots) {
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

		for (const document of descendantsRes.data) {
			if (memberIds.has(document.documentId)) continue;
			descendants.push({ ...document, rootDocumentId: root });
		}
	}

	return { error: undefined, data: descendants };
};

export default projectRequestTargetDescendants;
