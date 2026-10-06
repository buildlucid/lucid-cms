import type { CollectionBuilder } from "@lucidcms/core";
import type {
	CollectionTableNames,
	ServiceFn,
	Toolkit,
} from "@lucidcms/core/types";
import constants from "../../../constants.js";
import type { CollectionConfig, RouteScope } from "../../../types/types.js";
import fieldResToSchema from "../../../utils/field-res-to-schema.js";
import getParentPageId from "../../../utils/get-parent-page-id.js";
import resolvePagesCollectionLocalization from "../../../utils/resolve-pages-collection-localization.js";
import {
	checkCircularParents,
	checkFieldsExist,
	checkFullSlugUniqueness,
} from "../../checks/index.js";
import getPagesFields from "../../get-pages-fields.js";
import setFullSlug from "../../set-full-slug.js";
import updateRouteFields from "../../update-route-fields.js";
import buildDescendantFullSlugs from "./build-descendant-full-slugs.js";
import resolveParentFullSlug from "./resolve-parent-full-slug.js";

/**
 * Recomputes a stored page version's route from its parent in the scope, then
 * rewrites the descendants the scope may touch. Used after a version is
 * promoted into latest or an environment, captured into a request or restored,
 * and when a parent page is removed from a request.
 */
const refreshVersionRoute: ServiceFn<
	[
		{
			collection: CollectionConfig;
			collectionInstance: CollectionBuilder;
			tables: CollectionTableNames;
			toolkit: Toolkit;
			scope: RouteScope;
			documentId: number;
			versionId: number;
		},
	],
	undefined
> = async (context, data) => {
	const localization = resolvePagesCollectionLocalization({
		localization: context.config.localization,
		collection: data.collection,
		collectionInstance: data.collectionInstance,
	});

	const versionFieldsRes = await getPagesFields(context, {
		collectionKey: data.collection.key,
		scope: data.scope,
		tables: data.tables,
		versionIds: [data.versionId],
	});
	if (versionFieldsRes.error) return versionFieldsRes;
	const rows = versionFieldsRes.data[0]?.rows;
	//* a version without route fields has nothing to recompute
	if (!rows) return { error: undefined, data: undefined };

	const checkFieldsExistRes = checkFieldsExist({
		fields: {
			slug: fieldResToSchema(
				constants.fields.slug.key,
				data.collection.localized,
				localization,
				rows,
			),
			parentPage: fieldResToSchema(
				constants.fields.parentPage.key,
				false,
				localization,
				rows,
				data.collection.key,
			),
			fullSlug: fieldResToSchema(
				constants.fields.fullSlug.key,
				data.collection.localized,
				localization,
				rows,
			),
		},
	});
	if (checkFieldsExistRes.error) return checkFieldsExistRes;
	const { slug, parentPage, fullSlug } = checkFieldsExistRes.data;

	if (getParentPageId(parentPage) !== null) {
		const circularParentsRes = await checkCircularParents(context, {
			documentId: data.documentId,
			scope: data.scope,
			collectionKey: data.collection.key,
			fields: { parentPage },
			tables: data.tables,
		});
		if (circularParentsRes.error) return circularParentsRes;
	}

	const fullSlugRes = await resolveParentFullSlug(context, {
		collection: data.collection,
		collectionInstance: data.collectionInstance,
		scope: data.scope,
		tables: data.tables,
		fields: { slug, parentPage, all: [slug, parentPage, fullSlug] },
		documentVersionId: data.versionId,
	});
	if (fullSlugRes.error) return fullSlugRes;

	setFullSlug({
		fullSlug: fullSlugRes.data,
		localization,
		fields: { fullSlug },
	});

	const descendantsRes = await buildDescendantFullSlugs(context, {
		documentIds: [data.documentId],
		scope: data.scope,
		tables: data.tables,
		collection: data.collection,
		collectionInstance: data.collectionInstance,
		parentFullSlugField: fullSlug,
	});
	if (descendantsRes.error) return descendantsRes;

	const projectedFullSlugs = [
		{
			documentId: data.documentId,
			versionId: data.versionId,
			values: fullSlugRes.data,
		},
		...descendantsRes.data,
	];
	const uniquenessRes = await checkFullSlugUniqueness(context, {
		collection: data.collection,
		projectedFullSlugs,
		scope: data.scope,
		tables: data.tables,
		excludeDocumentIds: projectedFullSlugs.map((doc) => doc.documentId),
	});
	if (uniquenessRes.error) return uniquenessRes;

	//* promoted and captured slugs are stored as typed, so normalise them like a save would
	const updateSlugRes = await updateRouteFields(context, {
		toolkit: data.toolkit,
		collectionKey: data.collection.key,
		field: "slug",
		scope: data.scope,
		values: [
			{
				documentId: data.documentId,
				versionId: data.versionId,
				values: slug.translations
					? new Map(Object.entries(slug.translations))
					: new Map([[null, slug.value ?? null]]),
			},
		],
		tables: data.tables,
	});
	if (updateSlugRes.error) return updateSlugRes;

	return updateRouteFields(context, {
		toolkit: data.toolkit,
		collectionKey: data.collection.key,
		field: "fullSlug",
		scope: data.scope,
		excludeDocumentIds: [data.documentId],
		values: projectedFullSlugs,
		tables: data.tables,
	});
};

export default refreshVersionRoute;
